import { addHexPrefix, PrefixedHexString, stripHexPrefix } from "@ethereumjs/util";
import { Block } from "@web3auth/auth";
import { BigNumber } from "bignumber.js";
import { AddressLike } from "ethers";

import { CustomChainConfig, log, SafeEventEmitterProvider } from "../../../../../base";
import { TransactionParams } from "../../../rpc/interfaces";
import { decGWEIToHexWEI, hexWEIToDecGWEI } from "../../converter";
import { bnLessThan, BnMultiplyByFraction, bnToHex, hexToBn } from "../../utils";
import { EIP1559APIEndpoint, GAS_ESTIMATE_TYPES, LegacyGasAPIEndpoint, TRANSACTION_ENVELOPE_TYPES, TRANSACTION_TYPES } from "./constants";
import { EIP1159GasData, EthereumGasFeeEstimates, FallbackGasData, FeeHistoryResponse, GasData, LegacyGasData, TxType } from "./interfaces";
import { fetchEip1159GasEstimates, fetchLegacyGasPriceEstimates } from "./utils";

export class TransactionFormatter {
  // https://0x.org/docs/introduction/0x-cheat-sheet#swap-api-endpoints
  readonly API_SUPPORTED_CHAINIDS = new Set(["0x1", "0x5", "0x13881", "0xa4b1", "0xa86a", "0x2105", "0x38", "0xfa", "0xa", "0x89"]);

  private chainConfig: CustomChainConfig | null = null;

  private getProviderEngineProxy: () => SafeEventEmitterProvider;

  private isEIP1559Compatible = false;

  constructor({ getProviderEngineProxy }: { getProviderEngineProxy: () => SafeEventEmitterProvider }) {
    this.getProviderEngineProxy = getProviderEngineProxy;
  }

  get providerProxy() {
    return this.getProviderEngineProxy();
  }

  async init(): Promise<void> {
    this.chainConfig = (await this.providerProxy.request<never, CustomChainConfig>({ method: "eth_provider_config" })) as CustomChainConfig;
    this.isEIP1559Compatible = await this.getEIP1559Compatibility();
  }

  async formatTransaction(txParams: TransactionParams & { gas?: string }): Promise<TransactionParams & { gas?: string }> {
    if (!this.chainConfig) throw new Error("Chain config not initialized");

    const clonedTxParams = {
      ...txParams,
    };

    if (clonedTxParams.nonce === undefined)
      clonedTxParams.nonce = (await this.providerProxy.request<[string, string], number>({
        method: "eth_getTransactionCount",
        params: [txParams.from, "latest"],
      })) as number;

    if (!this.isEIP1559Compatible && clonedTxParams.gasPrice) {
      if (clonedTxParams.maxFeePerGas) delete clonedTxParams.maxFeePerGas;
      if (clonedTxParams.maxPriorityFeePerGas) delete clonedTxParams.maxPriorityFeePerGas;
      // if user provides gas Limit, we should use it instead
      // if gas is not provided explicitly, estimate it.
      if (!clonedTxParams.gasLimit) {
        if (!clonedTxParams.gas) {
          const defaultGasLimit = await this.getDefaultGasLimit(clonedTxParams);
          if (defaultGasLimit) {
            clonedTxParams.gasLimit = defaultGasLimit;
          }
        } else {
          clonedTxParams.gasLimit = addHexPrefix(clonedTxParams.gas);
        }
      }
      return clonedTxParams;
    }

    if (!clonedTxParams.gasLimit) {
      if (!clonedTxParams.gas) {
        const defaultGasLimit = await this.getDefaultGasLimit(clonedTxParams);
        if (defaultGasLimit) {
          clonedTxParams.gasLimit = defaultGasLimit;
        }
      } else {
        clonedTxParams.gasLimit = addHexPrefix(clonedTxParams.gas);
      }
    }

    const {
      gasPrice: defaultGasPrice,
      maxFeePerGas: defaultMaxFeePerGas,
      maxPriorityFeePerGas: defaultMaxPriorityFeePerGas,
    } = await this.getDefaultGasFees(clonedTxParams);

    if (this.isEIP1559Compatible) {
      // If the dapp has suggested a gas price, but no maxFeePerGas or maxPriorityFeePerGas
      //  then we set maxFeePerGas and maxPriorityFeePerGas to the suggested gasPrice.
      if (clonedTxParams.gasPrice && !clonedTxParams.maxFeePerGas && !clonedTxParams.maxPriorityFeePerGas) {
        clonedTxParams.maxFeePerGas = clonedTxParams.gasPrice;

        clonedTxParams.maxPriorityFeePerGas = bnLessThan(
          typeof defaultMaxPriorityFeePerGas === "string" ? stripHexPrefix(defaultMaxPriorityFeePerGas) : defaultMaxPriorityFeePerGas,
          typeof clonedTxParams.gasPrice === "string" ? stripHexPrefix(clonedTxParams.gasPrice) : clonedTxParams.gasPrice.toString()
        )
          ? addHexPrefix(defaultMaxPriorityFeePerGas)
          : addHexPrefix(clonedTxParams.gasPrice.toString());
      } else {
        if (defaultMaxFeePerGas && !clonedTxParams.maxFeePerGas) {
          // If the dapp has not set the gasPrice or the maxFeePerGas, then we set maxFeePerGas
          // with the one returned by the gasFeeController, if that is available.
          clonedTxParams.maxFeePerGas = addHexPrefix(defaultMaxFeePerGas);
        }

        if (defaultMaxPriorityFeePerGas && !clonedTxParams.maxPriorityFeePerGas) {
          // If the dapp has not set the gasPrice or the maxPriorityFeePerGas, then we set maxPriorityFeePerGas
          // with the one returned by the gasFeeController, if that is available.
          clonedTxParams.maxPriorityFeePerGas = addHexPrefix(defaultMaxPriorityFeePerGas);
        }

        if (defaultGasPrice && !clonedTxParams.maxFeePerGas) {
          // If the dapp has not set the gasPrice or the maxFeePerGas, and no maxFeePerGas is available
          // then we set maxFeePerGas to the defaultGasPrice, assuming it is
          // available.
          clonedTxParams.maxFeePerGas = addHexPrefix(defaultGasPrice);
        }

        if (clonedTxParams.maxFeePerGas && !clonedTxParams.maxPriorityFeePerGas) {
          // If the dapp has not set the gasPrice or the maxPriorityFeePerGas, and no maxPriorityFeePerGas is
          // available  then we set maxPriorityFeePerGas to
          // clonedTxParams.maxFeePerGas, which will either be the gasPrice from the controller, the maxFeePerGas
          // set by the dapp, or the maxFeePerGas from the controller.
          clonedTxParams.maxPriorityFeePerGas = clonedTxParams.maxFeePerGas;
        }
      }

      // We remove the gasPrice param entirely when on an eip1559 compatible network

      delete clonedTxParams.gasPrice;
    } else {
      // We ensure that maxFeePerGas and maxPriorityFeePerGas are not in the transaction params
      // when not on a EIP1559 compatible network

      delete clonedTxParams.maxPriorityFeePerGas;
      delete clonedTxParams.maxFeePerGas;
    }

    // If we have gotten to this point, and none of gasPrice, maxPriorityFeePerGas or maxFeePerGas are
    // set on txParams, it means that either we are on a non-EIP1559 network and the dapp didn't suggest
    // a gas price, or we are on an EIP1559 network, and none of gasPrice, maxPriorityFeePerGas or maxFeePerGas
    // were available from either the dapp or the network.
    if (defaultGasPrice && !clonedTxParams.gasPrice && !clonedTxParams.maxPriorityFeePerGas && !clonedTxParams.maxFeePerGas) {
      clonedTxParams.gasPrice = defaultGasPrice as never;
    }

    clonedTxParams.type = Number.parseInt(this.isEIP1559Compatible ? TRANSACTION_ENVELOPE_TYPES.FEE_MARKET : TRANSACTION_ENVELOPE_TYPES.LEGACY, 16);
    clonedTxParams.chainId = this.chainConfig.chainId as PrefixedHexString;
    return clonedTxParams;
  }

  private async fetchEthGasPriceEstimate(): Promise<{ gasPrice: string }> {
    const gasPrice = (await this.providerProxy.request<[], string>({ method: "eth_gasPrice", params: [] })) as string;
    return {
      gasPrice: hexWEIToDecGWEI(gasPrice).toString(),
    };
  }

  private async fetchGasEstimatesViaEthFeeHistory(): Promise<EthereumGasFeeEstimates> {
    const noOfBlocks = 10;
    const newestBlock = "latest";
    // get the 10, 50 and 95th percentile of the tip fees from the last 10 blocks
    const percentileValues = [10, 50, 95];
    const feeHistory = await this.providerProxy.request<[number, string, number[]], FeeHistoryResponse>({
      method: "eth_feeHistory",
      params: [noOfBlocks, newestBlock, percentileValues],
    });

    // this is in hex wei
    const finalBaseFeePerGas = feeHistory.baseFeePerGas[feeHistory.baseFeePerGas.length - 1];
    // this is in hex wei
    const priorityFeeCalcs = feeHistory.reward.reduce(
      (acc, curr) => {
        return {
          slow: acc.slow.plus(new BigNumber(curr[0], 16)),
          average: acc.average.plus(new BigNumber(curr[1], 16)),
          fast: acc.fast.plus(new BigNumber(curr[2], 16)),
        };
      },
      { slow: new BigNumber(0), average: new BigNumber(0), fast: new BigNumber(0) }
    );
    return {
      estimatedBaseFee: hexWEIToDecGWEI(finalBaseFeePerGas).toString(),
      high: {
        maxWaitTimeEstimate: 30_000,
        minWaitTimeEstimate: 15_000,
        suggestedMaxFeePerGas: hexWEIToDecGWEI(priorityFeeCalcs.fast.plus(finalBaseFeePerGas).toString(16)).toString(),
        suggestedMaxPriorityFeePerGas: hexWEIToDecGWEI(priorityFeeCalcs.fast.toString(16)).toString(),
      },
      medium: {
        maxWaitTimeEstimate: 45_000,
        minWaitTimeEstimate: 15_000,
        suggestedMaxFeePerGas: hexWEIToDecGWEI(priorityFeeCalcs.average.plus(finalBaseFeePerGas).toString(16)).toString(),
        suggestedMaxPriorityFeePerGas: hexWEIToDecGWEI(priorityFeeCalcs.average.toString(16)).toString(),
      },
      low: {
        maxWaitTimeEstimate: 60_000,
        minWaitTimeEstimate: 15_000,
        suggestedMaxFeePerGas: hexWEIToDecGWEI(priorityFeeCalcs.slow.plus(finalBaseFeePerGas).toString(16)).toString(),
        suggestedMaxPriorityFeePerGas: hexWEIToDecGWEI(priorityFeeCalcs.slow.toString(16)).toString(),
      },
    };
  }

  private async getEIP1559Compatibility(): Promise<boolean> {
    const latestBlock = await this.providerProxy.request<[string, boolean], Block>({ method: "eth_getBlockByNumber", params: ["latest", false] });
    const supportsEIP1559 = latestBlock && latestBlock.baseFeePerGas !== undefined;

    return !!supportsEIP1559;
  }

  private async fetchGasFeeEstimateData(): Promise<GasData> {
    if (!this.chainConfig) throw new Error("Chain config not initialized");
    const isLegacyGasAPICompatible = this.chainConfig.chainId === "0x1";

    const chainId = Number.parseInt(this.chainConfig.chainId, 16);

    let gasData: GasData;

    try {
      if (this.isEIP1559Compatible) {
        let estimates: EthereumGasFeeEstimates;
        try {
          if (this.API_SUPPORTED_CHAINIDS.has(this.chainConfig.chainId)) {
            estimates = await fetchEip1159GasEstimates(EIP1559APIEndpoint.replace("<chain_id>", `${chainId}`));
          } else {
            throw new Error("Chain id not supported by api");
          }
        } catch {
          estimates = await this.fetchGasEstimatesViaEthFeeHistory();
        }
        gasData = {
          gasFeeEstimates: estimates,
          gasEstimateType: GAS_ESTIMATE_TYPES.FEE_MARKET,
        };
      } else if (isLegacyGasAPICompatible) {
        const estimates = await fetchLegacyGasPriceEstimates(LegacyGasAPIEndpoint.replace("<chain_id>", `${chainId}`));
        gasData = {
          gasFeeEstimates: estimates,
          gasEstimateType: GAS_ESTIMATE_TYPES.LEGACY,
        };
      } else {
        throw new Error("Main gas fee/price estimation failed. Use fallback");
      }
    } catch {
      try {
        const estimates = await this.fetchEthGasPriceEstimate();
        gasData = {
          gasFeeEstimates: estimates,
          gasEstimateType: GAS_ESTIMATE_TYPES.ETH_GASPRICE,
        };
      } catch (error: unknown) {
        throw new Error(`Gas fee/price estimation failed. Message: ${(error as Error).message}`);
      }
    }
    return gasData;
  }

  private async getDefaultGasFees(
    txParams: TransactionParams & { gas?: string }
  ): Promise<{ gasPrice?: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string }> {
    if ((!this.isEIP1559Compatible && txParams.gasPrice) || (this.isEIP1559Compatible && txParams.maxFeePerGas && txParams.maxPriorityFeePerGas)) {
      return {};
    }

    try {
      const { gasFeeEstimates, gasEstimateType } = await this.fetchGasFeeEstimateData();
      if (this.isEIP1559Compatible && gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
        const { medium: { suggestedMaxPriorityFeePerGas, suggestedMaxFeePerGas } = {} } = gasFeeEstimates as EIP1159GasData;

        if (suggestedMaxPriorityFeePerGas && suggestedMaxFeePerGas) {
          return {
            maxFeePerGas: addHexPrefix(decGWEIToHexWEI(suggestedMaxFeePerGas)),
            maxPriorityFeePerGas: addHexPrefix(decGWEIToHexWEI(suggestedMaxPriorityFeePerGas)),
          };
        }
      } else if (gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY) {
        // The LEGACY type includes low, medium and high estimates of
        // gas price values.
        return {
          gasPrice: addHexPrefix(decGWEIToHexWEI((gasFeeEstimates as LegacyGasData).medium)),
        };
      } else if (gasEstimateType === GAS_ESTIMATE_TYPES.ETH_GASPRICE) {
        // The ETH_GASPRICE type just includes a single gas price property,
        // which we can assume was retrieved from eth_gasPrice
        return {
          gasPrice: addHexPrefix(decGWEIToHexWEI((gasFeeEstimates as FallbackGasData).gasPrice)),
        };
      }
    } catch (error) {
      log.error(error);
    }

    const { gasPrice } = await this.fetchEthGasPriceEstimate();

    return { gasPrice: addHexPrefix(decGWEIToHexWEI(gasPrice)) };
  }

  private async estimateTxGas(txMeta: TransactionParams): Promise<PrefixedHexString> {
    const txParams = { ...txMeta };

    // `eth_estimateGas` can fail if the user has insufficient balance for the
    // value being sent, or for the gas cost. We don't want to check their
    // balance here, we just want the gas estimate. The gas price is removed
    // to skip those balance checks. We check balance elsewhere. We also delete
    // maxFeePerGas and maxPriorityFeePerGas to support EIP-1559 txs.
    delete txParams.gasPrice;
    delete txParams.maxFeePerGas;
    delete txParams.maxPriorityFeePerGas;
    const gas = await this.providerProxy.request<[TransactionParams], PrefixedHexString>({ method: "eth_estimateGas", params: [txParams] });
    return gas;
  }

  private async analyzeGasUsage(txMeta: TransactionParams): Promise<{
    blockGasLimit: string;
    estimatedGasHex: string;
  }> {
    const block = (await this.providerProxy.request<[string, boolean], Block>({
      method: "eth_getBlockByNumber",
      params: ["latest", false],
    })) as Block;
    // fallback to block gasLimit
    const blockGasLimitBN = hexToBn(block.gasLimit as string);
    const saferGasLimitBN = BnMultiplyByFraction(blockGasLimitBN, 19, 20);
    let estimatedGasHex = bnToHex(saferGasLimitBN);

    try {
      estimatedGasHex = await this.estimateTxGas(txMeta);
    } catch (error: unknown) {
      log.warn(error);
    }
    return { blockGasLimit: block.gasLimit as string, estimatedGasHex };
  }

  private addGasBuffer(initialGasLimitHex: string, blockGasLimitHex: string, multiplier = 1.5): PrefixedHexString {
    const initialGasLimitBn = hexToBn(initialGasLimitHex);
    const blockGasLimitBn = hexToBn(blockGasLimitHex);
    const upperGasLimitBn = blockGasLimitBn.muln(0.9);
    const bufferedGasLimitBn = initialGasLimitBn.muln(multiplier);

    // if initialGasLimit is above blockGasLimit, dont modify it
    if (initialGasLimitBn.gt(upperGasLimitBn)) return bnToHex(initialGasLimitBn);
    // if bufferedGasLimit is below blockGasLimit, use bufferedGasLimit
    if (bufferedGasLimitBn.lt(upperGasLimitBn)) return bnToHex(bufferedGasLimitBn);
    // otherwise use blockGasLimit
    return bnToHex(upperGasLimitBn);
  }

  private async determineTransactionCategory(txParameters: TransactionParams & { gas?: string }): Promise<{
    transactionCategory: TxType | null;
    code?: string;
  }> {
    const { data, to } = txParameters;
    let code = "";

    let txCategory: TxType | null;

    if (data && !to) {
      txCategory = TRANSACTION_TYPES.DEPLOY_CONTRACT;
    } else {
      try {
        code = (await this.providerProxy.request<[AddressLike | "", string], string>({ method: "eth_getCode", params: [to, "latest"] })) as string;
      } catch (error) {
        log.warn(error);
      }
      const codeIsEmpty = !code || code === "0x" || code === "0x0";

      txCategory = codeIsEmpty ? TRANSACTION_TYPES.SENT_ETHER : TRANSACTION_TYPES.CONTRACT_INTERACTION;
    }

    return { transactionCategory: txCategory, code };
  }

  private async getDefaultGasLimit(txParams: TransactionParams & { gas?: string }): Promise<PrefixedHexString> {
    const { transactionCategory } = await this.determineTransactionCategory({ ...txParams });

    if (txParams.gas) {
      return addHexPrefix(txParams.gas);
    }

    if (txParams.to && transactionCategory === TRANSACTION_TYPES.SENT_ETHER) {
      // if there's data in the params, but there's no contract code, it's not a valid transaction
      if (txParams.data) {
        throw Error("TxGasUtil - Trying to call a function on a non-contract address");
      }

      const TWENTY_ONE_THOUSAND = 21_000;

      // This is a standard ether simple send, gas requirement is exactly 21k
      return addHexPrefix(TWENTY_ONE_THOUSAND.toString(16));
    }

    const { blockGasLimit, estimatedGasHex } = await this.analyzeGasUsage(txParams);

    // add additional gas buffer to our estimation for safety
    const gasLimit = this.addGasBuffer(addHexPrefix(estimatedGasHex), blockGasLimit as string);
    return gasLimit;
  }
}
