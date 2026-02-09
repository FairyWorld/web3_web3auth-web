import { createContext, Dispatch, SetStateAction } from "react";

import { ExternalButton, TOAST_TYPE, ToastType } from "../interfaces";

export type BodyState = {
  installLinks?: {
    show: boolean;
    wallet: ExternalButton;
  };
  multiChainSelector: {
    show: boolean;
    wallet: ExternalButton;
  };
  // Pre-selected wallet to show QR code directly when navigating to ConnectWallet page
  preSelectedWallet?: ExternalButton;
};

export type ToastState = {
  message: string;
  type: ToastType;
};

export type RootContextType = {
  bodyState: BodyState;
  setBodyState: Dispatch<SetStateAction<BodyState>>;
  toast: ToastState;
  setToast: Dispatch<SetStateAction<ToastState>>;
};

export const RootContext = createContext<RootContextType>({
  bodyState: {
    installLinks: {
      show: false,
      wallet: null,
    },
    multiChainSelector: {
      show: false,
      wallet: null,
    },
    preSelectedWallet: null,
  },
  toast: {
    message: "",
    type: TOAST_TYPE.SUCCESS,
  },
  setBodyState: () => {},
  setToast: () => {},
});
