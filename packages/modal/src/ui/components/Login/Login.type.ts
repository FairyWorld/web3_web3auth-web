import { BUILD_ENV_TYPE, WEB3AUTH_NETWORK_TYPE } from "@web3auth/auth";

import type {
  browser,
  ButtonRadiusType,
  ExternalButton,
  ExternalWalletEventType,
  LogoAlignmentType,
  os,
  platform,
  SocialLoginEventType,
  SocialLoginsConfig,
} from "../../interfaces";

export interface LoginProps {
  web3authClientId: string;
  web3authNetwork: WEB3AUTH_NETWORK_TYPE;
  authBuildEnv: BUILD_ENV_TYPE;
  isModalVisible: boolean;
  isDark: boolean;
  appLogo?: string;
  appName?: string;
  showPasswordLessInput: boolean;
  showExternalWalletButton: boolean;
  showExternalWalletCount: boolean;
  showInstalledExternalWallets: boolean;
  socialLoginsConfig: SocialLoginsConfig;
  installedExternalWalletConfig: ExternalButton[];
  areSocialLoginsVisible: boolean;
  isEmailPrimary: boolean;
  isExternalPrimary: boolean;
  isEmailPasswordLessLoginVisible: boolean;
  isSmsPasswordLessLoginVisible: boolean;
  totalExternalWallets: number;
  logoAlignment?: LogoAlignmentType;
  buttonRadius?: ButtonRadiusType;
  deviceDetails: { platform: platform; browser: browser; os: os };
  handleExternalWalletBtnClick?: (flag: boolean) => void;
  handleSocialLoginClick: (params: SocialLoginEventType) => void;
  handleExternalWalletClick: (params: ExternalWalletEventType) => void;
  handleSocialLoginHeight: () => void;
}
