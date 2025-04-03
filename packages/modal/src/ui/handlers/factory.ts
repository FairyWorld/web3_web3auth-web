import { AUTH_CONNECTION, AUTH_CONNECTION_TYPE } from "@web3auth/auth";

import type { PasswordlessHandlerParams } from "../interfaces";
import EmailPasswordlessHandler from "./EmailPasswordlessHandler";
import SmsPasswordlessHandler from "./SmsPasswordlessHandler";

export const createPasswordlessHandler = (authConnection: AUTH_CONNECTION_TYPE, params: PasswordlessHandlerParams) => {
  switch (authConnection) {
    case AUTH_CONNECTION.EMAIL_PASSWORDLESS:
      return new EmailPasswordlessHandler(params);
    case AUTH_CONNECTION.SMS_PASSWORDLESS:
      return new SmsPasswordlessHandler(params);
    default:
      throw new Error(`Unsupported auth connection: ${authConnection}`);
  }
};
