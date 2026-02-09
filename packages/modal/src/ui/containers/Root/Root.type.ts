import type { WALLET_CONNECTOR_TYPE } from "@web3auth/no-modal";

export interface RootProps {
  onCloseLoader: () => void;
  handleMobileVerifyConnect: (params: { connector: WALLET_CONNECTOR_TYPE }) => void;
}
