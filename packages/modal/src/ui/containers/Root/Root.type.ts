import type { WALLET_CONNECTOR_TYPE } from "@web3auth/no-modal";

import { SocialLoginEventType } from "../../interfaces";

export interface RootProps {
  handleSocialLoginClick: (params: SocialLoginEventType) => void;
  onCloseLoader: () => void;
  isConnectAndSignAuthenticationMode: boolean;
  handleMobileVerifyConnect: (params: { connector: WALLET_CONNECTOR_TYPE }) => void;
}
