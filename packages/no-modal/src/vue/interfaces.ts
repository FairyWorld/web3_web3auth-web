import { Ref, ShallowRef } from "vue";

import type { CONNECTOR_STATUS_TYPE, IPlugin, IProvider, IWeb3AuthCoreOptions } from "@/core/base";
import { WalletServicesPluginType } from "@/core/wallet-services-plugin";

import type { Web3AuthNoModal } from "../noModal";

export type Web3AuthContextConfig = {
  web3AuthOptions: IWeb3AuthCoreOptions;
};

export interface Web3AuthProviderProps {
  config: Web3AuthContextConfig;
}

interface IBaseWeb3AuthComposableContext {
  isConnected: Ref<boolean>;
  provider: Ref<IProvider | null>;
  isInitializing: Ref<boolean>;
  initError: Ref<Error | null>;
  isInitialized: Ref<boolean>;
  status: Ref<CONNECTOR_STATUS_TYPE | null>;
  isMFAEnabled: Ref<boolean>;
  getPlugin: (pluginName: string) => IPlugin | null;
  setIsMFAEnabled: (isMfaEnabled: boolean) => void;
}

export interface IWeb3AuthInnerContext extends IBaseWeb3AuthComposableContext {
  web3Auth: ShallowRef<Web3AuthNoModal | null>;
}

export interface IWalletServicesInnerContext {
  plugin: Ref<WalletServicesPluginType | null>;
  ready: Ref<boolean>;
  connecting: Ref<boolean>;
}
