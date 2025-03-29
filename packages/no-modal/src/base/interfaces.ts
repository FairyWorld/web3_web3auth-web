import { type BUTTON_POSITION_TYPE } from "@toruslabs/base-controllers";
import { type SmartAccountType } from "@toruslabs/ethereum-controllers";
import { AuthConnectionConfigItem, type WhiteLabelData } from "@web3auth/auth";

import { type ChainNamespaceType, type CustomChainConfig } from "./chain/IChainInterface";
import { SMART_ACCOUNT_WALLET_SCOPE } from "./constants";

export interface WhitelistResponse {
  urls: string[];
  signed_urls: Record<string, string>;
}

export type ChainsConfig = CustomChainConfig[];

export interface ExternalWalletsConfig {
  disableAllRecommendedWallets?: boolean;
  disableAllOtherWallets?: boolean;
  disabledWallets?: string[];
}

export type SmartAccountWalletScope = (typeof SMART_ACCOUNT_WALLET_SCOPE)[keyof typeof SMART_ACCOUNT_WALLET_SCOPE];

export interface SmartAccountsConfig {
  smartAccountType: SmartAccountType;
  walletScope: SmartAccountWalletScope;
  chains: {
    chainId: string;
    bundlerConfig: {
      url: string;
    };
    paymasterConfig?: {
      url: string;
    };
  }[];
}

export interface WalletUiConfig {
  enablePortfolioWidget?: boolean;
  enableConfirmationModal?: boolean;
  enableWalletConnect?: boolean;
  enableTokenDisplay?: boolean;
  enableNftDisplay?: boolean;
  enableShowAllTokensButton?: boolean;
  enableBuyButton?: boolean;
  enableSendButton?: boolean;
  enableSwapButton?: boolean;
  enableReceiveButton?: boolean;
  portfolioWidgetPosition?: BUTTON_POSITION_TYPE;
  defaultPortfolio?: "token" | "nft";
}

export interface LoginModalConfig {
  // design
  widgetType?: "embed" | "modal";
  logoAlignment?: "left" | "center";
  borderRadiusType?: "small" | "medium" | "large";
  buttonRadiusType?: "pill" | "rounded" | "square";
  tncLink?: string; // TODO: whitelabel also has this
  privacyPolicy?: string; // TODO: whitelabel also has this
  // authentication
  enableMainSocialLoginButton?: boolean;
  signInMethods?: ("social" | "passwordless" | "externalWallets")[];
  addPreviousLoginHint?: boolean;
  // external wallets
  displayInstalledExternalWallets?: boolean;
  displayExternalWalletsCount?: boolean;
}

export interface ProjectConfig {
  // General config
  userDataIncludedInToken?: boolean; // TODO: implement this
  sessionTime?: number;
  enableKeyExport?: boolean;
  walletConnectProjectId?: string;
  whitelist?: WhitelistResponse; // remain unchanged
  // Chains config
  chains?: ChainsConfig;
  // Smart accounts config
  smartAccounts?: SmartAccountsConfig;
  // Wallet config
  walletUi?: WalletUiConfig;
  // Authentication config
  externalWalletAuth?: ExternalWalletsConfig;
  embeddedWalletAuth?: (AuthConnectionConfigItem & { isDefault?: boolean })[];
  // Branding config
  whitelabel?: WhiteLabelData; // remain unchanged
  loginModal?: LoginModalConfig;
}

export interface WalletRegistryItem {
  name: string;
  chains: string[];
  walletConnect?: {
    sdks: string[];
  };
  app?: {
    browser?: string;
    android?: string;
    ios?: string;
    chrome?: string;
    firefox?: string;
    edge?: string;
  };
  mobile?: {
    native?: string;
    universal?: string;
    inAppBrowser?: string;
  };
  primaryColor?: string;
  injected?: {
    namespace: ChainNamespaceType;
    injected_id: string;
  }[];
  imgExtension?: string;
}

export type WalletRegistry = { others: Record<string, WalletRegistryItem>; default: Record<string, WalletRegistryItem> };
