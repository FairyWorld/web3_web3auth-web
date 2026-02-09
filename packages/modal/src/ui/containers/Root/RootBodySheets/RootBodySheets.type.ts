import type { ChainNamespaceType } from "@web3auth/no-modal";

export interface RootBodySheetsProps {
  preHandleExternalWalletClick: (params: { connector: string; chainNamespace?: ChainNamespaceType }) => void;
}
