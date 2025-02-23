import {
  AuthUserInfo,
  JRPCRequest,
  JRPCResponse,
  Maybe,
  RequestArguments,
  SafeEventEmitter,
  SendCallBack,
  UX_MODE,
  type UX_MODE_TYPE,
  WEB3AUTH_NETWORK,
  type WEB3AUTH_NETWORK_TYPE,
} from "@web3auth/auth";

import { ConnectorNamespaceType, CustomChainConfig } from "../chain/IChainInterface";
import { IWeb3Auth, IWeb3AuthCoreOptions } from "../core/IWeb3Auth";
import { Web3AuthError } from "../errors";
import { PROJECT_CONFIG_RESPONSE } from "../interfaces";
import { ProviderEvents, SafeEventEmitterProvider } from "../provider/IProvider";
import { CONNECTOR_CATEGORY, CONNECTOR_EVENTS, CONNECTOR_STATUS } from "./constants";

export type UserInfo = AuthUserInfo;

export { UX_MODE, UX_MODE_TYPE, WEB3AUTH_NETWORK, WEB3AUTH_NETWORK_TYPE };

export type CONNECTOR_CATEGORY_TYPE = (typeof CONNECTOR_CATEGORY)[keyof typeof CONNECTOR_CATEGORY];

export interface ConnectorInitOptions {
  /**
   * Whether to auto connect to the connector based on redirect mode or saved connectors
   */
  autoConnect?: boolean;
  /**
   * The chainId to connect to
   */
  chainId: string;
}

export type CONNECTOR_STATUS_TYPE = (typeof CONNECTOR_STATUS)[keyof typeof CONNECTOR_STATUS];

export type UserAuthInfo = { idToken: string };

export interface BaseConnectorSettings {
  coreOptions: IWeb3AuthCoreOptions;
  getCurrentChain: IWeb3Auth["getCurrentChain"];
  getChain: IWeb3Auth["getChain"];
}

export interface IProvider extends SafeEventEmitter<ProviderEvents> {
  get chainId(): string;
  request<S, R>(args: RequestArguments<S>): Promise<Maybe<R>>;
  sendAsync<T, U>(req: JRPCRequest<T>, callback: SendCallBack<JRPCResponse<U>>): void;
  sendAsync<T, U>(req: JRPCRequest<T>): Promise<JRPCResponse<U>>;
  send<T, U>(req: JRPCRequest<T>, callback: SendCallBack<JRPCResponse<U>>): void;
}

export interface IBaseProvider<T> extends IProvider {
  provider: SafeEventEmitterProvider | null;
  currentChain: CustomChainConfig;
  setupProvider(provider: T, chainId: string): Promise<void>;
  switchChain(params: { chainId: string }): Promise<void>;
  updateProviderEngineProxy(provider: SafeEventEmitterProvider): void;
  setKeyExportFlag(flag: boolean): void;
}

export interface IConnector<T> extends SafeEventEmitter {
  connectorNamespace: ConnectorNamespaceType;
  type: CONNECTOR_CATEGORY_TYPE;
  name: string;
  status: CONNECTOR_STATUS_TYPE;
  provider: IProvider | null;
  connectorData?: unknown;
  connnected: boolean;
  isInjected?: boolean;
  init(options?: ConnectorInitOptions): Promise<void>;
  disconnect(options?: { cleanup: boolean }): Promise<void>;
  connect(params?: T): Promise<IProvider | null>;
  getUserInfo(): Promise<Partial<UserInfo>>;
  enableMFA(params?: T): Promise<void>;
  manageMFA(params?: T): Promise<void>;
  switchChain(params: { chainId: string }): Promise<void>;
  authenticateUser(): Promise<UserAuthInfo>;
}

export type ConnectorParams = {
  projectConfig?: PROJECT_CONFIG_RESPONSE;
  coreOptions: IWeb3AuthCoreOptions;
  getCurrentChain: IWeb3Auth["getCurrentChain"];
  getChain: IWeb3Auth["getChain"];
};

export type ConnectorFn = (params: ConnectorParams) => IConnector<unknown>;

export type CONNECTED_EVENT_DATA = { connector: string; provider: IProvider; reconnected: boolean };

export interface IConnectorDataEvent {
  connectorName: string;
  data: unknown;
}

export type ConnectorEvents = {
  [CONNECTOR_EVENTS.NOT_READY]: () => void;
  [CONNECTOR_EVENTS.READY]: (connector: string) => void;
  [CONNECTOR_EVENTS.CONNECTED]: (data: CONNECTED_EVENT_DATA) => void;
  [CONNECTOR_EVENTS.DISCONNECTED]: () => void;
  [CONNECTOR_EVENTS.CONNECTING]: (data: { connector: string }) => void;
  [CONNECTOR_EVENTS.ERRORED]: (error: Web3AuthError) => void;
  [CONNECTOR_EVENTS.CONNECTOR_DATA_UPDATED]: (data: IConnectorDataEvent) => void;
  [CONNECTOR_EVENTS.CACHE_CLEAR]: () => void;
  [CONNECTOR_EVENTS.CONNECTORS_UPDATED]: (data: { connectors: IConnector<unknown>[] }) => void;
};

export interface BaseConnectorConfig {
  label: string;
  isInjected?: boolean;
  showOnModal?: boolean;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
}

export type LoginMethodConfig = Record<
  string,
  {
    /**
     * Display Name. If not provided, we use the default for auth app
     */
    name: string;
    /**
     * Description for button. If provided, it renders as a full length button. else, icon button
     */
    description?: string;
    /**
     * Logo to be shown on mouse hover. If not provided, we use the default for auth app
     */
    logoHover?: string;
    /**
     * Logo to be shown on dark background (dark theme). If not provided, we use the default for auth app
     */
    logoLight?: string;
    /**
     * Logo to be shown on light background (light theme). If not provided, we use the default for auth app
     */
    logoDark?: string;
    /**
     * Show login button on the main list
     */
    mainOption?: boolean;
    /**
     * Whether to show the login button on modal or not
     */
    showOnModal?: boolean;
    /**
     * Whether to show the login button on desktop
     */
    showOnDesktop?: boolean;
    /**
     * Whether to show the login button on mobile
     */
    showOnMobile?: boolean;
  }
>;

export type WalletConnectV2Data = { uri: string };
