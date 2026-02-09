import type { ChainNamespaceType } from "@web3auth/no-modal";
import type { JSX } from "react";

export interface RootBodySheetsProps {
  preHandleExternalWalletClick: (params: { connector: string; chainNamespace?: ChainNamespaceType }) => void;
  desktopInstallLinks: JSX.Element[];
  mobileInstallLinks: JSX.Element[];
}
