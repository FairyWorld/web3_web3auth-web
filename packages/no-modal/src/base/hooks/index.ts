import { BaseEmbedControllerState } from "@toruslabs/base-controllers";
import type { AuthUserInfo, LoginParams } from "@web3auth/auth";

import { CONNECTOR_STATUS_TYPE, IProvider, UserAuthInfo } from "../connector";
import { IPlugin } from "../plugin";

export interface IBaseWeb3AuthHookContext {
  isInitialized: boolean;
  isInitializing: boolean;
  initError: unknown;
  isConnected: boolean;
  isConnecting: boolean;
  connectError: unknown;
  provider: IProvider | null;
  userInfo: Partial<AuthUserInfo> | null;
  isMFAEnabled: boolean;
  status: CONNECTOR_STATUS_TYPE | null;
  enableMFA(params?: LoginParams): Promise<void>;
  manageMFA(params?: LoginParams): Promise<void>;
  logout(params?: { cleanup: boolean }): Promise<void>;
  getPlugin(pluginName: string): IPlugin | null;
  authenticateUser(): Promise<UserAuthInfo>;
  switchChain(params: { chainId: string }): Promise<void>;
}

export interface IBaseWalletServicesHookContext {
  isPluginConnected: boolean;
  showWalletConnectScanner(showWalletConnectParams?: BaseEmbedControllerState["showWalletConnect"]): Promise<void>;
  showSwap(showSwapParams?: BaseEmbedControllerState["showSwap"]): Promise<void>;
  showCheckout(showCheckoutParams?: BaseEmbedControllerState["showCheckout"]): Promise<void>;
  showWalletUI(showWalletUiParams?: BaseEmbedControllerState["showWalletUi"]): Promise<void>;
}
