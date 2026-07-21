import { CONNECTOR_INITIAL_AUTHENTICATION_MODE, WALLET_CONNECTOR_TYPE } from "@web3auth/no-modal";
import { createContext, type FC, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { browser, ExternalWalletEventType, LoginModalProps, os, platform, SocialLoginEventType } from "../interfaces";

type WidgetContextType = {
  isDark: boolean;
  appLogo?: string;
  deviceDetails: { platform: platform; browser: browser; os: os };
  uiConfig: LoginModalProps;
  isConnectAndSignAuthenticationMode: boolean;
  handleSocialLoginClick: (params: SocialLoginEventType) => void;
  handleExternalWalletClick: (params: ExternalWalletEventType) => void;
  handleMobileVerifyConnect: (params: { connector: WALLET_CONNECTOR_TYPE }) => void;
  handleShowExternalWallets: (externalWalletsInitialized: boolean) => void;
  handleAcceptConsent: () => void | Promise<void>;
  handleDeclineConsent: () => void | Promise<void>;
  handleChangeWallet: () => void | Promise<void>;
  closeModal: () => void;
};

type WidgetProviderProps = {
  children: ReactNode;
  isDark: boolean;
  deviceDetails: { platform: platform; browser: browser; os: os };
  uiConfig: LoginModalProps;
  handleSocialLoginClick: (params: SocialLoginEventType) => void;
  handleExternalWalletClick: (params: ExternalWalletEventType) => void;
  handleMobileVerifyConnect: (params: { connector: WALLET_CONNECTOR_TYPE }) => void;
  handleShowExternalWallets: (externalWalletsInitialized: boolean) => void;
  handleAcceptConsent: () => void | Promise<void>;
  handleDeclineConsent: () => void | Promise<void>;
  handleChangeWallet: () => void | Promise<void>;
  closeModal: () => void;
};

const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

export const WidgetProvider: FC<WidgetProviderProps> = ({
  children,
  isDark: isDarkProp = true,
  deviceDetails,
  uiConfig,
  handleSocialLoginClick,
  handleExternalWalletClick,
  handleMobileVerifyConnect,
  handleShowExternalWallets,
  handleAcceptConsent,
  handleDeclineConsent,
  handleChangeWallet,
  closeModal,
}) => {
  const [isDark, setIsDark] = useState(() => {
    if (uiConfig.mode === "auto" && typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return isDarkProp;
  });

  // When mode is "auto", follow live OS color-scheme changes so the modal re-themes without reopening.
  useEffect(() => {
    if (uiConfig.mode !== "auto" || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const applyPreference = () => {
      setIsDark(mql.matches);
      // Keep the CSS `dark` variant in sync with the React context value.
      document.getElementById("w3a-parent-container")?.classList.toggle("w3a--dark", mql.matches);
    };

    mql.addEventListener("change", applyPreference);
    return () => {
      mql.removeEventListener("change", applyPreference);
    };
  }, [uiConfig.mode]);

  const appLogo = useMemo(() => {
    return isDark ? uiConfig.logoDark : uiConfig.logoLight;
  }, [isDark, uiConfig.logoDark, uiConfig.logoLight]);

  const isConnectAndSignAuthenticationMode = useMemo(
    () => uiConfig.initialAuthenticationMode === CONNECTOR_INITIAL_AUTHENTICATION_MODE.CONNECT_AND_SIGN,
    [uiConfig.initialAuthenticationMode]
  );

  return (
    <WidgetContext.Provider
      value={{
        isDark,
        appLogo,
        deviceDetails,
        uiConfig,
        isConnectAndSignAuthenticationMode,
        handleSocialLoginClick,
        handleExternalWalletClick,
        handleMobileVerifyConnect,
        handleShowExternalWallets,
        handleAcceptConsent,
        handleDeclineConsent,
        handleChangeWallet,
        closeModal,
      }}
    >
      {children}
    </WidgetContext.Provider>
  );
};

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
