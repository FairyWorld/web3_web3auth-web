import type { ExternalButton, ExternalWalletEventType } from "../../interfaces";

export interface LoginProps {
  installedExternalWalletConfig: ExternalButton[];
  totalExternalWallets: number;
  remainingUndisplayedWallets: number;
  handleExternalWalletClick: (params: ExternalWalletEventType) => void;
  handleSocialLoginHeight: () => void;
}
