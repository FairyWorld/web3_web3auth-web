import { SmartAccountType } from "@toruslabs/ethereum-controllers";
import { LoginConfig, WhiteLabelData } from "@web3auth/auth";

import { ChainNamespaceType, CustomChainConfig } from "./chain/IChainInterface";

export interface WhitelistResponse {
  urls: string[];
  signed_urls: Record<string, string>;
}

export type ChainConfigItem = {
  enabled: boolean;
  config: CustomChainConfig;
};

export interface ExternalWalletsConfig {
  enabled: boolean;
  config: Record<string, { enabled: boolean }>;
}

export type LoginConfigItem = {
  enabled: boolean;
  config?: LoginConfig[keyof LoginConfig];
};

export const SMART_ACCOUNT_WALLET_SCOPE = {
  EMBEDDED_ONLY: "embeddedOnly",
  ALL: "all",
} as const;

export type SmartAccountWalletScope = (typeof SMART_ACCOUNT_WALLET_SCOPE)[keyof typeof SMART_ACCOUNT_WALLET_SCOPE];

export interface SmartAccountsConfig {
  enabled: boolean;
  config: {
    smartAccountType: SmartAccountType;
    walletScope: SmartAccountWalletScope;
    chains: {
      [chainId: string]: {
        bundlerConfig: {
          url: string;
        };
        paymasterConfig?: {
          url: string;
        };
      };
    };
  };
}

// TODO: finalize the project config
export interface ProjectConfig {
  // Legacy
  whitelabel?: WhiteLabelData;
  sms_otp_enabled: boolean;
  /** @deprecated If external_wallets.enabled is true, WC will be enabled automatically */
  wallet_connect_enabled: boolean;
  /** @deprecated always use Web3Auth WalletConnect project ID */
  wallet_connect_project_id?: string;
  whitelist?: WhitelistResponse;
  key_export_enabled?: boolean;
  // Chains
  chains?: Record<string, ChainConfigItem>;
  // Login config
  externalWalletLogin?: ExternalWalletsConfig;
  // Smart accounts
  smartAccounts?: SmartAccountsConfig;
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
