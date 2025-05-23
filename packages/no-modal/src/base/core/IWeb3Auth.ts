import { type AccountAbstractionMultiChainConfig } from "@toruslabs/ethereum-controllers";
import {
  type BUILD_ENV_TYPE,
  type LoginParams,
  MfaLevelType,
  MfaSettings,
  SafeEventEmitter,
  UX_MODE_TYPE,
  type WhiteLabelData,
} from "@web3auth/auth";
import { type WsEmbedParams } from "@web3auth/ws-embed";

import { type ChainNamespaceType, type CustomChainConfig } from "../chain/IChainInterface";
import {
  CONNECTED_EVENT_DATA,
  CONNECTOR_EVENTS,
  type CONNECTOR_STATUS_TYPE,
  ConnectorEvents,
  type ConnectorFn,
  type IBaseProvider,
  type IConnector,
  type IdentityTokenInfo,
  type IProvider,
  type UserInfo,
  type WEB3AUTH_NETWORK_TYPE,
} from "../connector";
import { Web3AuthError } from "../errors";
import { LoginModeType } from "../interfaces";
import { type IPlugin, type PluginFn } from "../plugin";
import { type WALLET_CONNECTOR_TYPE, WALLET_CONNECTORS } from "../wallet";

export type AuthLoginParams = LoginParams & {
  // to maintain backward compatibility
  loginHint?: string;

  idToken?: string;
};

export type WalletServicesConfig = Omit<
  WsEmbedParams,
  "buildEnv" | "enableLogging" | "chainId" | "chains" | "confirmationStrategy" | "accountAbstractionConfig"
> & {
  /**
   * Determines how to show confirmation screens
   * @defaultValue default
   *
   * default & auto-approve
   * - use auto-approve as default
   * - if wallet connect request use modal
   *
   * modal
   * - use modal always
   */
  confirmationStrategy?: Exclude<WsEmbedParams["confirmationStrategy"], "popup">;
  modalZIndex?: number;
};

export interface UIConfig extends WhiteLabelData {
  /**
   * UX Mode for the auth connector
   */
  uxMode?: UX_MODE_TYPE;
}

export interface IWeb3AuthCoreOptions {
  /**
   * Client id for web3auth.
   * You can obtain your client id from the web3auth developer dashboard.
   * You can set any random string for this on localhost.
   */
  clientId: string;

  /**
   * multiple chain configurations,
   * only provided chains will be used
   */
  chains?: CustomChainConfig[];

  /**
   * default chain Id to use
   */
  defaultChainId?: string;

  /**
   * setting to true will enable logs
   *
   * @defaultValue false
   */
  enableLogging?: boolean;
  /**
   * setting to "local" will persist social login session across browser tabs.
   *
   * @defaultValue "local"
   */
  // TODO: rename this to match customauth, sfa
  storageType?: "session" | "local" | "cookies";

  /**
   * sessionTime (in seconds) for idToken issued by Web3Auth for server side verification.
   * @defaultValue 7 * 86400
   *
   * Note: max value can be 30 days (86400 * 30) and min can be  1 sec (1)
   */
  sessionTime?: number;

  /**
   * Web3Auth Network to use for the session.
   */
  web3AuthNetwork: WEB3AUTH_NETWORK_TYPE;

  /**
   * Uses core-kit key with web3auth provider
   * @defaultValue false
   */
  useSFAKey?: boolean;

  /**
   * WhiteLabel options for web3auth
   */
  uiConfig?: UIConfig;

  /**
   * Account abstraction config for your chain namespace
   */
  accountAbstractionConfig?: AccountAbstractionMultiChainConfig;

  /**
   * Whether to use AA with external wallet
   */
  useAAWithExternalWallet?: boolean;

  /**
   * Connectors to use
   */
  connectors?: ConnectorFn[];

  /**
   * Plugins to use
   */
  plugins?: PluginFn[];

  /**
   * Whether to enable multi injected provider discovery
   * @defaultValue true
   */
  multiInjectedProviderDiscovery?: boolean;

  /**
   * Wallet services config
   */
  walletServicesConfig?: WalletServicesConfig;

  /**
   * Private key provider for xrpl, mpc cases
   */
  privateKeyProvider?: IBaseProvider<string>;

  /**
   * Whether to enable SSR mode
   *
   * @defaultValue false
   */
  ssr?: boolean;

  /**
   * Build environment for Auth connector
   * @internal
   * @defaultValue BUILD_ENV.PRODUCTION
   */
  authBuildEnv?: BUILD_ENV_TYPE;

  /**
   * MFA settings for the auth connector
   */
  mfaSettings?: MfaSettings;

  /**
   * MFA level for the auth connector
   */
  mfaLevel?: MfaLevelType;
}

export type LoginParamMap = {
  [WALLET_CONNECTORS.AUTH]: Partial<AuthLoginParams>;
  [WALLET_CONNECTORS.METAMASK]: { chainNamespace: ChainNamespaceType };
  [WALLET_CONNECTORS.COINBASE]: { chainNamespace: ChainNamespaceType };
  [WALLET_CONNECTORS.WALLET_CONNECT_V2]: { chainNamespace: ChainNamespaceType };
};

export interface IWeb3AuthCore extends SafeEventEmitter {
  readonly coreOptions: IWeb3AuthCoreOptions;
  connectedConnectorName: WALLET_CONNECTOR_TYPE | null;
  currentChain: CustomChainConfig | undefined;
  status: CONNECTOR_STATUS_TYPE;
  provider: IProvider | null;
  init(options?: { signal?: AbortSignal }): Promise<void>;
  getConnector(connectorName: WALLET_CONNECTOR_TYPE): IConnector<unknown> | null;
  getPlugin(pluginName: string): IPlugin | null;
  logout(options?: { cleanup: boolean }): Promise<void>;
  getUserInfo(): Promise<Partial<UserInfo>>;
  getIdentityToken(): Promise<IdentityTokenInfo>;
  switchChain(params: { chainId: string }): Promise<void>;
}

export interface IWeb3Auth extends IWeb3AuthCore {
  connected: boolean;
  cachedConnector: string | null;
  getConnector(connectorName: WALLET_CONNECTOR_TYPE): IConnector<unknown> | null;
  /**
   * Connect to a specific wallet connector
   * @param walletName - Key of the wallet connector to use.
   */
  connectTo<T extends WALLET_CONNECTOR_TYPE>(walletName: T, loginParams?: LoginParamMap[T]): Promise<IProvider | null>;
  enableMFA<T>(params: T): Promise<void>;
  manageMFA<T>(params: T): Promise<void>;
  cleanup(): Promise<void>;
}

export type SDK_CONNECTED_EVENT_DATA = CONNECTED_EVENT_DATA & { loginMode: LoginModeType };

export type Web3AuthNoModalEvents = Omit<ConnectorEvents, "connected" | "errored" | "ready"> & {
  [CONNECTOR_EVENTS.READY]: () => void;
  [CONNECTOR_EVENTS.CONNECTED]: (data: SDK_CONNECTED_EVENT_DATA) => void;
  [CONNECTOR_EVENTS.ERRORED]: (error: Web3AuthError, loginMode: LoginModeType) => void;
  MODAL_VISIBILITY: (visibility: boolean) => void;
};

export type Web3AuthNoModalOptions = IWeb3AuthCoreOptions;
