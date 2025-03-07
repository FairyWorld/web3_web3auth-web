import type { BaseAdapterConfig, ChainNamespaceType, IProvider, IWeb3Auth, LoginMethodConfig, WALLET_ADAPTER_TYPE } from "@web3auth/no-modal";

export interface ModalConfig extends Omit<BaseAdapterConfig, "isInjected"> {
  loginMethods?: LoginMethodConfig;
}

export interface AdaptersModalConfig {
  chainNamespace: ChainNamespaceType;
  adapters?: Record<WALLET_ADAPTER_TYPE, ModalConfig>;
}

export interface ModalConfigParams {
  modalConfig?: Record<WALLET_ADAPTER_TYPE, ModalConfig>;
  hideWalletDiscovery?: boolean;
}

export interface IWeb3AuthModal extends IWeb3Auth {
  initModal(params?: ModalConfigParams): Promise<void>;
  connect(): Promise<IProvider | null>;
}
