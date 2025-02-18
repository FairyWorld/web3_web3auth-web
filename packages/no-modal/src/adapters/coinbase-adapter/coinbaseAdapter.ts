import { AppMetadata, CoinbaseWalletSDK, Preference, ProviderInterface } from "@coinbase/wallet-sdk";

import {
  ADAPTER_CATEGORY,
  ADAPTER_CATEGORY_TYPE,
  ADAPTER_EVENTS,
  ADAPTER_NAMESPACES,
  ADAPTER_STATUS,
  ADAPTER_STATUS_TYPE,
  AdapterInitOptions,
  AdapterNamespaceType,
  BaseAdapterSettings,
  CHAIN_NAMESPACES,
  ChainNamespaceType,
  CONNECTED_EVENT_DATA,
  CustomChainConfig,
  IProvider,
  UserInfo,
  WALLET_ADAPTERS,
  WalletLoginError,
  Web3AuthError,
} from "@/core/base";

import { BaseEvmAdapter } from "../base-evm-adapter";

export type CoinbaseWalletSDKOptions = Partial<AppMetadata & Preference>;

export interface CoinbaseAdapterOptions extends BaseAdapterSettings {
  adapterSettings?: CoinbaseWalletSDKOptions;
}

class CoinbaseAdapter extends BaseEvmAdapter<void> {
  readonly adapterNamespace: AdapterNamespaceType = ADAPTER_NAMESPACES.EIP155;

  readonly currentChainNamespace: ChainNamespaceType = CHAIN_NAMESPACES.EIP155;

  readonly type: ADAPTER_CATEGORY_TYPE = ADAPTER_CATEGORY.EXTERNAL;

  readonly name: string = WALLET_ADAPTERS.COINBASE;

  public status: ADAPTER_STATUS_TYPE = ADAPTER_STATUS.NOT_READY;

  private coinbaseProvider: ProviderInterface | null = null;

  private coinbaseOptions: CoinbaseWalletSDKOptions = { appName: "Web3Auth" };

  constructor(adapterOptions: CoinbaseAdapterOptions = {}) {
    super(adapterOptions);
    this.setAdapterSettings(adapterOptions);
  }

  get provider(): IProvider | null {
    if (this.status !== ADAPTER_STATUS.NOT_READY && this.coinbaseProvider) {
      return this.coinbaseProvider as unknown as IProvider;
    }
    return null;
  }

  set provider(_: IProvider | null) {
    throw new Error("Not implemented");
  }

  public setAdapterSettings(options: CoinbaseAdapterOptions): void {
    super.setAdapterSettings(options);
    this.coinbaseOptions = { ...this.coinbaseOptions, ...options.adapterSettings };
  }

  async init(options: AdapterInitOptions = {}): Promise<void> {
    await super.init(options);
    super.checkInitializationRequirements();
    const coinbaseInstance = new CoinbaseWalletSDK({
      ...this.coinbaseOptions,
      appChainIds: [Number.parseInt(this.chainConfig.chainId, 16)],
    });
    this.coinbaseProvider = coinbaseInstance.makeWeb3Provider({ options: this.coinbaseOptions.options || "smartWalletOnly" });
    this.status = ADAPTER_STATUS.READY;
    this.emit(ADAPTER_EVENTS.READY, WALLET_ADAPTERS.COINBASE);
    try {
      if (options.autoConnect) {
        this.rehydrated = true;
        await this.connect();
      }
    } catch (error) {
      this.emit(ADAPTER_EVENTS.ERRORED, error as Web3AuthError);
    }
  }

  async connect(): Promise<IProvider | null> {
    super.checkConnectionRequirements();
    if (!this.coinbaseProvider) throw WalletLoginError.notConnectedError("Adapter is not initialized");
    this.status = ADAPTER_STATUS.CONNECTING;
    this.emit(ADAPTER_EVENTS.CONNECTING, { adapter: WALLET_ADAPTERS.COINBASE });
    try {
      await this.coinbaseProvider.request({ method: "eth_requestAccounts" });
      const chainId = (await this.coinbaseProvider.request({ method: "eth_chainId" })) as string;
      if (chainId !== (this.chainConfig as CustomChainConfig).chainId) {
        await this.addChain(this.chainConfig as CustomChainConfig);
        await this.switchChain(this.chainConfig as CustomChainConfig, true);
      }
      this.status = ADAPTER_STATUS.CONNECTED;
      if (!this.provider) throw WalletLoginError.notConnectedError("Failed to connect with provider");
      this.provider.once("disconnect", () => {
        // ready to be connected again
        this.disconnect();
      });
      this.emit(ADAPTER_EVENTS.CONNECTED, {
        adapter: WALLET_ADAPTERS.COINBASE,
        reconnected: this.rehydrated,
        provider: this.provider,
      } as CONNECTED_EVENT_DATA);
      return this.provider;
    } catch (error) {
      // ready again to be connected
      this.status = ADAPTER_STATUS.READY;
      this.rehydrated = false;
      this.emit(ADAPTER_EVENTS.ERRORED, error as Web3AuthError);
      if (error instanceof Web3AuthError) throw error;
      throw WalletLoginError.connectionError("Failed to login with coinbase wallet", error);
    }
  }

  async disconnect(options: { cleanup: boolean } = { cleanup: false }): Promise<void> {
    await super.disconnectSession();
    this.provider?.removeAllListeners();
    if (options.cleanup) {
      this.status = ADAPTER_STATUS.NOT_READY;
      this.coinbaseProvider = null;
    } else {
      // ready to be connected again
      this.status = ADAPTER_STATUS.READY;
    }
    await super.disconnect();
  }

  async getUserInfo(): Promise<Partial<UserInfo>> {
    if (this.status !== ADAPTER_STATUS.CONNECTED) throw WalletLoginError.notConnectedError("Not connected with wallet, Please login/connect first");
    return {};
  }

  public async addChain(chainConfig: CustomChainConfig, init = false): Promise<void> {
    super.checkAddChainRequirements(chainConfig, init);
    await this.coinbaseProvider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainConfig.chainId,
          chainName: chainConfig.displayName,
          rpcUrls: [chainConfig.rpcTarget],
          blockExplorerUrls: [chainConfig.blockExplorerUrl],
          nativeCurrency: {
            name: chainConfig.tickerName,
            symbol: chainConfig.ticker,
            decimals: chainConfig.decimals || 18,
          },
          iconUrls: [chainConfig.logo],
        },
      ],
    });
    super.addChainConfig(chainConfig);
  }

  public async switchChain(params: { chainId: string }, init = false): Promise<void> {
    super.checkSwitchChainRequirements(params, init);
    await this.coinbaseProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: params.chainId }],
    });
    this.setAdapterSettings({ chainConfig: this.getChainConfig(params.chainId) });
  }

  public async enableMFA(): Promise<void> {
    throw new Error("Method Not implemented");
  }

  public async manageMFA(): Promise<void> {
    throw new Error("Method Not implemented");
  }
}

export { CoinbaseAdapter };
