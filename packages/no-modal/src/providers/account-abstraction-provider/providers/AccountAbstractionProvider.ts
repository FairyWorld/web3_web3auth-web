import { type AccountAbstractionConfig } from "@toruslabs/ethereum-controllers";
import { JRPCEngine, providerErrors, providerFromEngine } from "@web3auth/auth";
import { type Client, createPublicClient, defineChain, http } from "viem";
import { type BundlerClient, createBundlerClient, createPaymasterClient, type PaymasterClient, type SmartAccount } from "viem/account-abstraction";

import { CHAIN_NAMESPACES, type CustomChainConfig, type IProvider, WalletInitializationError } from "@/core/base";

import { BaseProvider, type BaseProviderConfig, type BaseProviderState } from "../../base-provider";
import { createAaMiddleware, eoaProviderAsMiddleware } from "../rpc/ethRpcMiddlewares";
import {
  BiconomySmartAccountConfig,
  ISmartAccount,
  KernelSmartAccountConfig,
  NexusSmartAccountConfig,
  SafeSmartAccountConfig,
  TrustSmartAccountConfig,
} from "./smartAccounts";
import { SMART_ACCOUNT } from "./smartAccounts/constants";
import { type BundlerConfig, type PaymasterConfig } from "./types";
import { getProviderHandlers } from "./utils";

interface AccountAbstractionProviderConfig extends BaseProviderConfig {
  smartAccountInit: ISmartAccount;
  bundlerConfig: BundlerConfig;
  paymasterConfig?: PaymasterConfig;
}
interface AccountAbstractionProviderState extends BaseProviderState {
  eoaProvider?: IProvider;
}

class AccountAbstractionProvider extends BaseProvider<AccountAbstractionProviderConfig, AccountAbstractionProviderState, IProvider> {
  readonly PROVIDER_CHAIN_NAMESPACE = CHAIN_NAMESPACES.EIP155;

  private _smartAccount: SmartAccount | null;

  private _publicClient: Client | null;

  private _bundlerClient: BundlerClient | null;

  private _paymasterClient: PaymasterClient | null;

  constructor({ config, state }: { config: AccountAbstractionProviderConfig; state?: AccountAbstractionProviderState }) {
    super({ config, state });
  }

  get smartAccount(): SmartAccount | null {
    return this._smartAccount;
  }

  get bundlerClient(): BundlerClient | null {
    return this._bundlerClient;
  }

  get paymasterClient(): PaymasterClient | null {
    return this._paymasterClient;
  }

  get publicClient(): Client | null {
    return this._publicClient;
  }

  public static getProviderInstance = async (params: {
    eoaProvider: IProvider;
    smartAccountInit: ISmartAccount;
    chainConfig: CustomChainConfig;
    bundlerConfig: BundlerConfig;
    paymasterConfig?: PaymasterConfig;
  }): Promise<AccountAbstractionProvider> => {
    const providerFactory = new AccountAbstractionProvider({ config: params });
    await providerFactory.setupProvider(params.eoaProvider);
    providerFactory.update({ eoaProvider: params.eoaProvider });
    return providerFactory;
  };

  public async enable(): Promise<string[]> {
    if (!this.state.eoaProvider) throw providerErrors.custom({ message: "eoaProvider is not found in state, please pass it", code: 4902 });
    await this.setupProvider(this.state.eoaProvider);
    return this._providerEngineProxy.request({ method: "eth_accounts" });
  }

  public async setupProvider(eoaProvider: IProvider): Promise<void> {
    const { chainNamespace } = this.config.chainConfig;
    if (chainNamespace !== this.PROVIDER_CHAIN_NAMESPACE) throw WalletInitializationError.incompatibleChainNameSpace("Invalid chain namespace");
    const chain = defineChain({
      id: Number.parseInt(this.config.chainConfig.chainId, 16), // id in number form
      name: this.config.chainConfig.displayName,
      rpcUrls: {
        default: {
          http: [this.config.chainConfig.rpcTarget],
          webSocket: [this.config.chainConfig.wsTarget],
        },
      },
      blockExplorers: this.config.chainConfig.blockExplorerUrl
        ? {
            default: {
              name: "explorer", // TODO: correct name if chain config has it
              url: this.config.chainConfig.blockExplorerUrl,
            },
          }
        : undefined,
      nativeCurrency: {
        name: this.config.chainConfig.tickerName,
        symbol: this.config.chainConfig.ticker,
        decimals: this.config.chainConfig.decimals || 18,
      },
    });
    // setup public client for viem smart account
    this._publicClient = createPublicClient({
      chain,
      transport: http(this.config.chainConfig.rpcTarget),
    }) as Client;
    this._smartAccount = await this.config.smartAccountInit.getSmartAccount({
      owner: eoaProvider,
      client: this._publicClient,
    });

    // setup bundler and paymaster
    if (this.config.paymasterConfig) {
      this._paymasterClient = createPaymasterClient({
        ...this.config.paymasterConfig,
        transport: this.config.paymasterConfig.transport ?? http(this.config.paymasterConfig.url),
      });
    }
    this._bundlerClient = createBundlerClient({
      ...this.config.bundlerConfig,
      account: this.smartAccount,
      client: this._publicClient,
      transport: this.config.bundlerConfig.transport ?? http(this.config.bundlerConfig.url),
      paymaster: this._paymasterClient,
    });

    const providerHandlers = getProviderHandlers({
      bundlerClient: this._bundlerClient,
      smartAccount: this._smartAccount,
      chain,
      eoaProvider,
    });

    // setup rpc engine and AA middleware
    const engine = new JRPCEngine();
    const aaMiddleware = await createAaMiddleware({
      eoaProvider,
      handlers: providerHandlers,
    });
    engine.push(aaMiddleware);
    const eoaMiddleware = eoaProviderAsMiddleware(eoaProvider);
    engine.push(eoaMiddleware);
    const provider = providerFromEngine(engine);
    this.updateProviderEngineProxy(provider);
    eoaProvider.once("chainChanged", () => {
      this.setupChainSwitchMiddleware();
    });
  }

  public async updateAccount(_params: { privateKey: string }): Promise<void> {
    throw providerErrors.unsupportedMethod("updateAccount. Please call it on eoaProvider");
  }

  public async switchChain(_params: { chainId: string }): Promise<void> {
    throw providerErrors.unsupportedMethod("switchChain. Please call it on eoaProvider");
  }

  protected async lookupNetwork(): Promise<string> {
    throw providerErrors.unsupportedMethod("lookupNetwork. Please call it on eoaProvider");
  }

  private async setupChainSwitchMiddleware() {
    const chainConfig = await this.state.eoaProvider.request<never, CustomChainConfig>({ method: "eth_provider_config" });
    this.update({ chainId: chainConfig.chainId });
    this.configure({
      chainConfig: { ...chainConfig, chainNamespace: CHAIN_NAMESPACES.EIP155, chainId: chainConfig.chainId, rpcTarget: chainConfig.rpcTarget },
    });
    return this.setupProvider(this.state.eoaProvider);
  }
}

export const accountAbstractionProvider = async ({
  accountAbstractionConfig,
  chainConfig,
  provider,
}: {
  accountAbstractionConfig: AccountAbstractionConfig;
  chainConfig: CustomChainConfig;
  provider: IProvider;
}) => {
  let smartAccountInit: ISmartAccount;
  const { smartAccountType, smartAccountConfig, bundlerConfig, paymasterConfig } = accountAbstractionConfig;
  switch (smartAccountType) {
    case SMART_ACCOUNT.BICONOMY: {
      const { BiconomySmartAccount } = await import("@/core/account-abstraction-provider");
      smartAccountInit = new BiconomySmartAccount(smartAccountConfig as BiconomySmartAccountConfig);
      break;
    }
    case SMART_ACCOUNT.KERNEL: {
      const { KernelSmartAccount } = await import("@/core/account-abstraction-provider");
      smartAccountInit = new KernelSmartAccount(smartAccountConfig as KernelSmartAccountConfig);
      break;
    }
    case SMART_ACCOUNT.NEXUS: {
      const { NexusSmartAccount } = await import("@/core/account-abstraction-provider");
      smartAccountInit = new NexusSmartAccount(smartAccountConfig as NexusSmartAccountConfig);
      break;
    }
    case SMART_ACCOUNT.SAFE: {
      const { SafeSmartAccount } = await import("@/core/account-abstraction-provider");
      smartAccountInit = new SafeSmartAccount(smartAccountConfig as SafeSmartAccountConfig);
      break;
    }
    case SMART_ACCOUNT.TRUST: {
      const { TrustSmartAccount } = await import("@/core/account-abstraction-provider");
      smartAccountInit = new TrustSmartAccount(smartAccountConfig as TrustSmartAccountConfig);
      break;
    }
    // case SMART_ACCOUNT.LIGHT: {
    //   const { LightSmartAccount } = await import("@/core/account-abstraction-provider");
    //   smartAccountInit = new LightSmartAccount();
    //   break;
    // }
    // case SMART_ACCOUNT.SIMPLE: {
    //   const { SimpleSmartAccount } = await import("@/core/account-abstraction-provider");
    //   smartAccountInit = new SimpleSmartAccount();
    //   break;
    // }
    default:
      throw new Error("Invalid smart account type");
  }
  return AccountAbstractionProvider.getProviderInstance({
    eoaProvider: provider,
    smartAccountInit,
    chainConfig,
    bundlerConfig,
    paymasterConfig,
  });
};
