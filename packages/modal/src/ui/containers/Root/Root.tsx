import { WALLET_CONNECTORS, type WalletRegistryItem } from "@web3auth/no-modal";
import { useCallback, useMemo, useState } from "react";

import Footer from "../../components/Footer/Footer";
import Loader from "../../components/Loader";
import Toast from "../../components/Toast";
import { DEFAULT_METAMASK_WALLET_REGISTRY_ITEM, PAGES } from "../../constants";
import { useModalState } from "../../context/ModalStateContext";
import { RootProvider, useRoot } from "../../context/RootContext";
import { useWidget } from "../../context/WidgetContext";
import { ExternalButton, MODAL_STATUS } from "../../interfaces";
import ConnectWallet from "../ConnectWallet";
import Login from "../Login";
import { RootProps } from "./Root.type";
import RootBodySheets from "./RootBodySheets/RootBodySheets";

function RootContent(props: RootProps) {
  const { handleMobileVerifyConnect, onCloseLoader } = props;

  const { modalState, preHandleExternalWalletClick, shouldShowLoginPage, showPasswordLessInput, areSocialLoginsVisible } = useModalState();
  const { appLogo, deviceDetails, uiConfig, isConnectAndSignAuthenticationMode } = useWidget();
  const { chainNamespaces, walletRegistry, privacyPolicy, tncLink, displayInstalledExternalWallets, hideSuccessScreen } = uiConfig;

  const { bodyState } = useRoot();

  const [isSocialLoginsExpanded, setIsSocialLoginsExpanded] = useState(false);
  const [isWalletDetailsExpanded, setIsWalletDetailsExpanded] = useState(false);

  // External Wallets
  const config = useMemo(() => modalState.externalWalletsConfig, [modalState.externalWalletsConfig]);

  const connectorVisibilityMap = useMemo(() => {
    const canShowMap: Record<string, boolean> = {};

    Object.keys(config).forEach((connector) => {
      canShowMap[connector] = Boolean(config[connector]?.showOnModal);
    });
    return canShowMap;
  }, [config]);

  const isWalletConnectConnectorIncluded = useMemo(
    // WC is always included when enabling wallet discovery
    () => Object.keys(walletRegistry?.default || {}).length > 0 || Object.keys(walletRegistry?.others || {}).length > 0,
    [walletRegistry]
  );

  const generateWalletButtons = useCallback(
    (wallets: Record<string, WalletRegistryItem>): ExternalButton[] => {
      return Object.keys(wallets).reduce((acc, wallet) => {
        if (connectorVisibilityMap[wallet] === false) return acc;

        const walletRegistryItem: WalletRegistryItem = wallets[wallet];
        let href = "";
        if (deviceDetails.platform !== "desktop") {
          const universalLink = walletRegistryItem?.mobile?.universal;
          const deepLink = walletRegistryItem?.mobile?.native;
          href = universalLink || deepLink;
        }

        // determine the chain namespaces supported by the wallet
        const connectorConfig = config[wallet];
        const connectorChainNamespaces = connectorConfig?.chainNamespaces || [];
        const registryNamespaces = new Set(walletRegistryItem.chains?.map((chain) => chain.split(":")[0]));
        const injectedChainNamespaces = new Set(walletRegistryItem.injected?.map((injected) => injected.namespace));
        const availableChainNamespaces = chainNamespaces.filter(
          (x) => registryNamespaces.has(x) || injectedChainNamespaces.has(x) || connectorChainNamespaces.includes(x)
        );

        const button: ExternalButton = {
          name: wallet,
          displayName: walletRegistryItem.name,
          href,
          hasInjectedWallet: connectorConfig?.isInjected || false,
          isInstalled: !!connectorConfig,
          hasWalletConnect: isWalletConnectConnectorIncluded && walletRegistryItem.walletConnect?.sdks?.includes("sign_v2"),
          hasInstallLinks: Object.keys(walletRegistryItem.app || {}).length > 0,
          walletRegistryItem,
          imgExtension: walletRegistryItem.imgExtension || "svg",
          icon: connectorConfig?.icon,
          chainNamespaces: availableChainNamespaces,
        };

        if (!button.hasInjectedWallet && !button.hasWalletConnect && !button.hasInstallLinks) return acc;
        if (availableChainNamespaces.length === 0) return acc;

        acc.push(button);
        return acc;
      }, [] as ExternalButton[]);
    },
    [connectorVisibilityMap, chainNamespaces, config, deviceDetails.platform, isWalletConnectConnectorIncluded]
  );

  const allRegistryButtons = useMemo(() => {
    return [...generateWalletButtons(walletRegistry.default), ...generateWalletButtons(walletRegistry.others)];
  }, [generateWalletButtons, walletRegistry.default, walletRegistry.others]);

  const installedConnectorButtons = useMemo(() => {
    const installedConnectors = Object.keys(config).reduce((acc, connector) => {
      if (connector === WALLET_CONNECTORS.WALLET_CONNECT_V2 || !connectorVisibilityMap[connector]) return acc;
      const connectorConfig = config[connector];
      acc.push({
        name: connector,
        displayName: connectorConfig?.label || connector,
        hasInjectedWallet: connectorConfig?.isInjected || false,
        isInstalled: true,
        hasWalletConnect: false,
        hasInstallLinks: false,
        icon: connectorConfig?.icon,
        chainNamespaces: connectorConfig?.chainNamespaces || [],
      });
      return acc;
    }, [] as ExternalButton[]);

    // if metamask connector is not injected, use the registry button instead to display QR code
    const metamaskConnectorIdx = installedConnectors.findIndex((x) => x.name === WALLET_CONNECTORS.METAMASK && !x.hasInjectedWallet);
    if (metamaskConnectorIdx !== -1) {
      const metamaskConnector = installedConnectors[metamaskConnectorIdx];
      let metamaskRegistryButton = allRegistryButtons.find((button) => button.name === WALLET_CONNECTORS.METAMASK);
      if (!metamaskRegistryButton) {
        // use the default metamask registry item if it's not in the registry
        metamaskRegistryButton = generateWalletButtons({
          [WALLET_CONNECTORS.METAMASK]: DEFAULT_METAMASK_WALLET_REGISTRY_ITEM,
        })[0];
      }
      if (metamaskRegistryButton) {
        installedConnectors.splice(metamaskConnectorIdx, 1, {
          ...metamaskRegistryButton,
          chainNamespaces: metamaskConnector.chainNamespaces, // preserve the chain namespaces
          isInstalled: true,
        });
      }
    }

    // make metamask the first button and limit the number of buttons
    return installedConnectors;
  }, [allRegistryButtons, config, connectorVisibilityMap, generateWalletButtons]);

  const customConnectorButtons = useMemo(() => {
    return installedConnectorButtons.filter((button) => !button.hasInjectedWallet);
  }, [installedConnectorButtons]);

  const topInstalledConnectorButtons = useMemo(() => {
    const MAX_TOP_INSTALLED_CONNECTORS = 3;

    // make metamask the first button and limit the number of buttons
    return installedConnectorButtons
      .sort((a, _) => (a.name === WALLET_CONNECTORS.METAMASK ? -1 : 1))
      .slice(0, displayInstalledExternalWallets ? MAX_TOP_INSTALLED_CONNECTORS : 1);
  }, [installedConnectorButtons, displayInstalledExternalWallets]);

  const allExternalWallets = useMemo(() => {
    const uniqueButtonSet = new Set();
    return installedConnectorButtons.concat(allRegistryButtons).filter((button) => {
      if (uniqueButtonSet.has(button.name)) return false;
      uniqueButtonSet.add(button.name);
      return true;
    });
  }, [allRegistryButtons, installedConnectorButtons]);

  const remainingUndisplayedWallets = useMemo(() => {
    return allExternalWallets.filter((button) => {
      return !topInstalledConnectorButtons.includes(button);
    }).length;
  }, [allExternalWallets, topInstalledConnectorButtons]);

  const isExternalWalletModeOnly = useMemo(() => {
    return !showPasswordLessInput && !areSocialLoginsVisible;
  }, [areSocialLoginsVisible, showPasswordLessInput]);

  const handleSocialLoginHeight = () => {
    setIsSocialLoginsExpanded((prev) => !prev);
  };

  const handleWalletDetailsHeight = () => {
    setIsWalletDetailsExpanded((prev) => !prev);
  };

  const containerMaxHeight = useMemo(() => {
    const isPrivacyPolicyOrTncLink = privacyPolicy || tncLink;

    // Loader Screen
    if (modalState.status !== MODAL_STATUS.INITIALIZED) {
      return "530px";
    }

    // Wallet Details Screen
    if (isWalletDetailsExpanded) {
      return isPrivacyPolicyOrTncLink ? "680px" : "628px";
    }

    // Connect Wallet Screen
    if (modalState.currentPage === PAGES.CONNECT_WALLET) {
      return isPrivacyPolicyOrTncLink ? "640px" : "580px";
    }

    // Expanded Social Login Screen
    if (isSocialLoginsExpanded) {
      return isPrivacyPolicyOrTncLink ? "644px" : "588px";
    }

    // Only MetaMask
    if (topInstalledConnectorButtons.length === 1) {
      return isPrivacyPolicyOrTncLink ? "560px" : "530px";
    }

    // More than 1 connector
    if (topInstalledConnectorButtons.length > 1) {
      const maxHeight = 500 + (topInstalledConnectorButtons.length - 1) * 58;
      if (isPrivacyPolicyOrTncLink) {
        return `${maxHeight + 60}px`;
      }
      return `${maxHeight + 16}px`;
    }
    // Default
    return "539px";
  }, [
    privacyPolicy,
    tncLink,
    modalState.status,
    modalState.currentPage,
    isWalletDetailsExpanded,
    isSocialLoginsExpanded,
    topInstalledConnectorButtons.length,
  ]);

  const isShowLoader = useMemo(() => {
    return modalState.status !== MODAL_STATUS.INITIALIZED;
  }, [modalState.status]);

  return (
    <div className="w3a--relative w3a--flex w3a--flex-col">
      <div
        className="w3a--relative w3a--h-screen w3a--overflow-hidden w3a--transition-all w3a--duration-[400ms] w3a--ease-in-out"
        style={{
          maxHeight: containerMaxHeight,
        }}
      >
        <div className="w3a--modal-curtain" />
        <div className="w3a--relative w3a--flex w3a--h-full w3a--flex-1 w3a--flex-col w3a--p-6">
          {/* Content */}
          {isShowLoader ? (
            <Loader
              connector={modalState.detailedLoaderConnector}
              connectorName={modalState.detailedLoaderConnectorName}
              modalStatus={modalState.status}
              onClose={onCloseLoader}
              appLogo={appLogo}
              isConnectAndSignAuthenticationMode={isConnectAndSignAuthenticationMode}
              externalWalletsConfig={modalState.externalWalletsConfig}
              walletRegistry={walletRegistry}
              handleMobileVerifyConnect={handleMobileVerifyConnect}
              hideSuccessScreen={hideSuccessScreen}
            />
          ) : (
            <>
              {/* Login Screen */}
              {modalState.currentPage === PAGES.LOGIN && shouldShowLoginPage && modalState.status === MODAL_STATUS.INITIALIZED && (
                <Login
                  installedExternalWalletConfig={topInstalledConnectorButtons}
                  totalExternalWallets={allExternalWallets.length}
                  remainingUndisplayedWallets={remainingUndisplayedWallets}
                  handleSocialLoginHeight={handleSocialLoginHeight}
                  handleExternalWalletClick={preHandleExternalWalletClick}
                />
              )}
              {/* Connect Wallet Screen */}
              {modalState.currentPage === PAGES.CONNECT_WALLET &&
                (!shouldShowLoginPage || isExternalWalletModeOnly) &&
                modalState.status === MODAL_STATUS.INITIALIZED && (
                  <ConnectWallet
                    allRegistryButtons={allRegistryButtons}
                    connectorVisibilityMap={connectorVisibilityMap}
                    customConnectorButtons={customConnectorButtons}
                    handleWalletDetailsHeight={handleWalletDetailsHeight}
                    isExternalWalletModeOnly={isExternalWalletModeOnly}
                    handleExternalWalletClick={preHandleExternalWalletClick}
                    disableBackButton={bodyState.installLinks?.show || bodyState.multiChainSelector?.show}
                  />
                )}
            </>
          )}

          {/* Footer */}
          <Footer privacyPolicy={privacyPolicy} termsOfService={tncLink} />

          <RootBodySheets />
        </div>
      </div>
      <Toast />
    </div>
  );
}

function Root(props: RootProps) {
  return (
    <RootProvider>
      <RootContent {...props} />
    </RootProvider>
  );
}
export default Root;
