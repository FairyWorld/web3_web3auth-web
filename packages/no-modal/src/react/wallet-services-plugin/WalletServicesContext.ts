import { type BaseEmbedControllerState } from "@toruslabs/base-controllers";
import { Context, createContext, createElement, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { CONNECTOR_STATUS, EVM_PLUGINS, IBaseWeb3AuthHookContext, PLUGIN_EVENTS, WalletServicesPluginError } from "@/core/base";
import { type WalletServicesPluginType } from "@/core/wallet-services-plugin";

import { IWalletServicesContext } from "./interfaces";

export const WalletServicesContext = createContext<IWalletServicesContext>(null);

export function WalletServicesContextProvider<T extends IBaseWeb3AuthHookContext>({ children, context }: PropsWithChildren<{ context: Context<T> }>) {
  const [isPluginConnected, setIsPluginConnected] = useState<boolean>(false);
  const [walletServicesPlugin, setWalletServicesPlugin] = useState<WalletServicesPluginType>(null);
  const web3AuthContext = useContext(context);
  const { getPlugin, isInitialized, isConnected } = web3AuthContext;

  useEffect(() => {
    if (isInitialized) {
      const plugin = getPlugin(EVM_PLUGINS.WALLET_SERVICES) as WalletServicesPluginType;
      setWalletServicesPlugin(plugin);
    }
  }, [isInitialized, getPlugin]);

  useEffect(() => {
    if (isConnected) {
      const plugin = getPlugin(EVM_PLUGINS.WALLET_SERVICES) as WalletServicesPluginType;
      if (!walletServicesPlugin) setWalletServicesPlugin(plugin);
      // when rehydrating, the connectedListener may be registered after the connected event is emitted, we need to check the status here
      if (walletServicesPlugin?.status === CONNECTOR_STATUS.CONNECTED) setIsPluginConnected(true);
    }
  }, [isConnected, getPlugin, walletServicesPlugin]);

  useEffect(() => {
    const connectedListener = () => {
      setIsPluginConnected(true);
    };

    const disconnectedListener = () => {
      setIsPluginConnected(false);
    };

    if (walletServicesPlugin) {
      walletServicesPlugin.on(PLUGIN_EVENTS.CONNECTED, connectedListener);
      walletServicesPlugin.on(PLUGIN_EVENTS.DISCONNECTED, disconnectedListener);
    }

    return () => {
      if (walletServicesPlugin) {
        walletServicesPlugin.off(PLUGIN_EVENTS.CONNECTED, connectedListener);
        walletServicesPlugin.off(PLUGIN_EVENTS.DISCONNECTED, disconnectedListener);
      }
    };
  }, [walletServicesPlugin]);

  const showWalletConnectScanner = useCallback(
    async (showWalletConnectParams?: BaseEmbedControllerState["showWalletConnect"]) => {
      if (!walletServicesPlugin) throw WalletServicesPluginError.notInitialized();
      if (!isPluginConnected) throw WalletServicesPluginError.walletPluginNotConnected();

      return walletServicesPlugin.showWalletConnectScanner(showWalletConnectParams);
    },
    [walletServicesPlugin, isPluginConnected]
  );

  const showWalletUI = useCallback(
    async (showWalletUiParams?: BaseEmbedControllerState["showWalletUi"]) => {
      if (!walletServicesPlugin) throw WalletServicesPluginError.notInitialized();
      if (!isPluginConnected) throw WalletServicesPluginError.walletPluginNotConnected();

      return walletServicesPlugin.showWalletUi(showWalletUiParams);
    },
    [walletServicesPlugin, isPluginConnected]
  );

  const showCheckout = useCallback(
    async (showCheckoutParams?: BaseEmbedControllerState["showCheckout"]) => {
      if (!walletServicesPlugin) throw WalletServicesPluginError.notInitialized();
      if (!isPluginConnected) throw WalletServicesPluginError.walletPluginNotConnected();

      return walletServicesPlugin.showCheckout(showCheckoutParams);
    },
    [walletServicesPlugin, isPluginConnected]
  );

  const showSwap = useCallback(
    async (showSwapParams?: BaseEmbedControllerState["showSwap"]) => {
      if (!walletServicesPlugin) throw WalletServicesPluginError.notInitialized();
      if (!isPluginConnected) throw WalletServicesPluginError.walletPluginNotConnected();

      return walletServicesPlugin.showSwap(showSwapParams);
    },
    [walletServicesPlugin, isPluginConnected]
  );

  const value = useMemo(() => {
    return {
      plugin: walletServicesPlugin,
      isPluginConnected,
      showWalletConnectScanner,
      showCheckout,
      showWalletUI,
      showSwap,
    };
  }, [walletServicesPlugin, isPluginConnected, showWalletConnectScanner, showCheckout, showWalletUI, showSwap]);

  return createElement(WalletServicesContext.Provider, { value }, children);
}
