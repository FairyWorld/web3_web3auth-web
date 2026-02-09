import { useTranslation } from "react-i18next";

import BottomSheet from "../../../components/BottomSheet";
import Image from "../../../components/Image";
import { useBodyState } from "../../../context/RootContext";
import { useWidget } from "../../../context/WidgetContext";
import i18n from "../../../localeImport";
import ConnectWalletChainNamespaceSelect from "../../ConnectWallet/ConnectWalletChainNamespaceSelect";
import { RootBodySheetsProps } from "./RootBodySheets.type";

export default function RootBodySheets({ preHandleExternalWalletClick, desktopInstallLinks, mobileInstallLinks }: RootBodySheetsProps) {
  const [t] = useTranslation(undefined, { i18n });
  const { bodyState, setBodyState } = useBodyState();
  const { isDark, deviceDetails, uiConfig } = useWidget();

  return (
    <>
      {/* Multi Chain Selector */}
      {bodyState.multiChainSelector?.show && (
        <BottomSheet
          borderRadiusType={uiConfig.borderRadiusType}
          isShown={bodyState.multiChainSelector.show}
          onClose={() => setBodyState({ ...bodyState, multiChainSelector: { show: false, wallet: null } })}
        >
          <ConnectWalletChainNamespaceSelect
            isDark={isDark}
            wallet={bodyState.multiChainSelector.wallet}
            handleExternalWalletClick={(params) => {
              preHandleExternalWalletClick(params);
              setBodyState({ ...bodyState, multiChainSelector: { show: false, wallet: null } });
            }}
          />
        </BottomSheet>
      )}

      {/* Wallet Install Links */}
      {bodyState.installLinks?.show && (
        <BottomSheet
          borderRadiusType={uiConfig.borderRadiusType}
          isShown={bodyState.installLinks.show}
          onClose={() => setBodyState({ ...bodyState, installLinks: { show: false, wallet: null } })}
        >
          <p className="w3a--mb-2 w3a--text-center w3a--text-base w3a--font-semibold w3a--text-app-gray-900 dark:w3a--text-app-white">
            {t("modal.getWallet")}
          </p>
          <div className="w3a--my-4 w3a--flex w3a--justify-center">
            <Image
              imageId={`login-${bodyState.installLinks.wallet.name}`}
              hoverImageId={`login-${bodyState.installLinks.wallet.name}`}
              fallbackImageId="wallet"
              height="80"
              width="80"
              isButton
              extension={bodyState.installLinks.wallet.imgExtension}
            />
          </div>
          <ul className="w3a--flex w3a--flex-col w3a--gap-y-2">{deviceDetails.platform === "desktop" ? desktopInstallLinks : mobileInstallLinks}</ul>
        </BottomSheet>
      )}
    </>
  );
}
