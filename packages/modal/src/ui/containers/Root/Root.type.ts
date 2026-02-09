import type { WALLET_CONNECTOR_TYPE } from "@web3auth/no-modal";

export interface RootProps {
  onCloseLoader: () => void;
  isConnectAndSignAuthenticationMode: boolean;
  handleMobileVerifyConnect: (params: { connector: WALLET_CONNECTOR_TYPE }) => void;
}
