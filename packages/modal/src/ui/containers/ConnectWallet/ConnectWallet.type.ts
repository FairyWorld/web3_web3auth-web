import type { ExternalButton } from "../../interfaces";

export interface ConnectWalletProps {
  allRegistryButtons: ExternalButton[];
  customConnectorButtons: ExternalButton[];
  connectorVisibilityMap: Record<string, boolean>;
  handleWalletDetailsHeight: () => void;
  isExternalWalletModeOnly?: boolean;
}
