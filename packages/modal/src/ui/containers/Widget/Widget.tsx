import { WALLET_CONNECTORS, WIDGET_TYPE } from "@web3auth/no-modal";
import { useEffect, useMemo } from "react";

import Modal from "../../components/Modal";
import { MODAL_ANIMATION_DURATION_MS, PAGES } from "../../constants";
import { ModalStateProvider, useModalState } from "../../context/ModalStateContext";
import { useWidget } from "../../context/WidgetContext";
import { MODAL_STATUS } from "../../interfaces";
import Embed from "../Embed";
import Root from "../Root";
import { WidgetProps } from "./Widget.type";

function WidgetContent() {
  const { uiConfig, handleExternalWalletClick, closeModal, isConnectAndSignAuthenticationMode } = useWidget();

  const { modalState, setModalState } = useModalState();

  const { widgetType } = uiConfig;

  const onCloseModal = () => {
    // Hide the modal immediately to kick off the slide-down/fade-out animation.
    setModalState((prevState) => ({
      ...prevState,
      modalVisibility: false,
    }));
    closeModal();

    // Defer resetting the view-defining state until the exit animation finishes.
    // Root reads modalState live, so resetting these fields synchronously would
    // make the sheet snap back to the login screen while it is still animating away.
    window.setTimeout(() => {
      setModalState((prevState) => {
        // The modal was reopened before the animation completed; keep the current view.
        if (prevState.modalVisibility) return prevState;
        return {
          ...prevState,
          status: MODAL_STATUS.INITIALIZED,
          externalWalletsVisibility: false,
          currentPage: PAGES.LOGIN_OPTIONS,
        };
      });
    }, MODAL_ANIMATION_DURATION_MS);
  };

  const onCloseLoader = () => {
    if (!isConnectAndSignAuthenticationMode && modalState.status === MODAL_STATUS.CONNECTED) {
      setModalState({
        ...modalState,
        modalVisibility: false,
        externalWalletsVisibility: false,
      });
    }
    if (isConnectAndSignAuthenticationMode && modalState.status === MODAL_STATUS.AUTHORIZED) {
      setModalState({
        ...modalState,
        modalVisibility: false,
        externalWalletsVisibility: false,
      });
    }
    if (modalState.status === MODAL_STATUS.ERRORED) {
      setModalState({
        ...modalState,
        modalVisibility: true,
        status: MODAL_STATUS.INITIALIZED,
        postLoadingMessage: "",
      });
    }
    if (modalState.status === MODAL_STATUS.BLOCKED) {
      setModalState({
        ...modalState,
        modalVisibility: false,
        externalWalletsVisibility: false,
      });
    }
  };

  const showCloseIcon = useMemo(() => {
    return (
      modalState.status === MODAL_STATUS.INITIALIZED ||
      modalState.status === MODAL_STATUS.CONNECTED ||
      modalState.status === MODAL_STATUS.ERRORED ||
      modalState.status === MODAL_STATUS.BLOCKED ||
      modalState.status === MODAL_STATUS.AUTHORIZED
    );
  }, [modalState.status]);

  useEffect(() => {
    // Prewarm WalletConnect for the regular connect flow so mobile users get a QR URI
    // as soon as the modal opens. Skip this during account linking because that flow
    // owns its own WalletConnect session and stores its URI in `accountLinking.walletConnectUri`.
    if (!modalState.modalVisibility) return;
    if (modalState.accountLinking.active) return;
    if (typeof modalState.externalWalletsConfig === "object") {
      // auto connect to WC if not injected to generate QR code URI for mobile connection
      const wcAvailable = (modalState.externalWalletsConfig[WALLET_CONNECTORS.WALLET_CONNECT_V2]?.showOnModal || false) !== false;
      if (wcAvailable && !modalState.walletConnectUri && typeof handleExternalWalletClick === "function") {
        handleExternalWalletClick({ connector: WALLET_CONNECTORS.WALLET_CONNECT_V2 });
      }
    }
  }, [modalState, handleExternalWalletClick]);

  const rootElement = <Root onCloseLoader={onCloseLoader} />;

  if (widgetType === WIDGET_TYPE.MODAL) {
    return (
      <Modal
        open={modalState.modalVisibility}
        placement="center"
        padding={false}
        showCloseIcon={showCloseIcon}
        onClose={onCloseModal}
        borderRadius={uiConfig.borderRadiusType}
      >
        {/* This is to prevent the root from being mounted when the modal is not open. This results in the loader and modal state being updated again and again. */}
        {modalState.modalVisibility && rootElement}
      </Modal>
    );
  }

  return (
    <Embed open={modalState.modalVisibility} padding={false} onClose={onCloseModal} borderRadius={uiConfig.borderRadiusType}>
      {/* This is to prevent the root from being mounted when the modal is not open. This results in the loader and modal state being updated again and again. */}
      {modalState.modalVisibility && rootElement}
    </Embed>
  );
}

function Widget(props: WidgetProps) {
  const { stateListener } = props;

  return (
    <ModalStateProvider stateListener={stateListener}>
      <WidgetContent />
    </ModalStateProvider>
  );
}

export default Widget;
