import { LOGIN_PROVIDER } from "@web3auth/auth";

import { cn } from "../../../utils";
import Image from "../../Image";
import { ButtonSocialProps } from "./ButtonSocial.type";

function getProviderIcon(method: string, isDark: boolean, isPrimaryBtn: boolean) {
  const imageId =
    method === LOGIN_PROVIDER.TWITTER ? `login-twitter-x${isDark ? "-light" : "-dark"}` : `login-${method}${isDark ? "-light" : "-dark"}`;
  const hoverId =
    method === LOGIN_PROVIDER.APPLE || method === LOGIN_PROVIDER.GITHUB || method === LOGIN_PROVIDER.TWITTER ? imageId : `login-${method}-active`;
  if (isPrimaryBtn) {
    return <Image width="20" imageId={hoverId} hoverImageId={hoverId} isButton />;
  }
  return <Image width="20" imageId={imageId} hoverImageId={hoverId} />;
}

function SocialLoginButton(props: ButtonSocialProps) {
  const { text, showIcon, showText, method, isDark, isPrimaryBtn, onClick, children, btnStyle } = props;
  return (
    <button type="button" onClick={(e) => onClick && onClick(e)} className={cn("w3a--btn", btnStyle)}>
      {showIcon && getProviderIcon(method, isDark, isPrimaryBtn)}
      {showText && <p className="w3a--text-sm w3a--font-normal w3a--text-app-gray-900 dark:w3a--text-app-white">{text}</p>}
      {children}
    </button>
  );
}

export default SocialLoginButton;
