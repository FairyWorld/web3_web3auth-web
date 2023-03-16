import { createAsyncMiddleware, JRPCMiddleware, JRPCRequest, mergeMiddleware } from "@toruslabs/openlogin-jrpc";
import { SubmitResponse, Transaction } from "xrpl";

export const RPC_METHODS = {
  GET_ACCOUNTS: "ripple_getAccounts",
  GET_KEY_PAIR: "ripple_getKeyPair",
  GET_PUBLIC_KEY: "ripple_getPublicKey",
  GET_XRP_BALANCE: "ripple_xrpBalance",
  SIGN_MESSAGE: "ripple_signTransaction",
  SIGN_TRANSACTION: "ripple_submitTransaction",
  SUBMIT_TRANSACTION: "ripple_submitMessage",
};

export type KeyPair = { publicKey: string; privateKey: string };
export interface IProviderHandlers {
  getAccounts: (req: JRPCRequest<unknown>) => Promise<string[]>;
  getKeyPair: (req: JRPCRequest<unknown>) => Promise<KeyPair>;
  getPublicKey: (req: JRPCRequest<unknown>) => Promise<string>;
  getBalance: (req: JRPCRequest<unknown>) => Promise<string>;
  signTransaction: (req: JRPCRequest<{ transaction: Transaction; multisign: string | boolean }>) => Promise<{ tx_blob: string; hash: string }>;
  submitTransaction: (req: JRPCRequest<{ transaction: Transaction }>) => Promise<SubmitResponse>;
  signMessage: (req: JRPCRequest<{ message: string }>) => Promise<{ signature: string }>;
}

export function createGetAccountsMiddleware({ getAccounts }: { getAccounts: IProviderHandlers["getAccounts"] }): JRPCMiddleware<unknown, unknown> {
  return createAsyncMiddleware(async (request, response, next) => {
    const { method } = request;
    if (method !== RPC_METHODS.GET_ACCOUNTS) return next();

    if (!getAccounts) throw new Error("WalletMiddleware - opts.getAccounts not provided");
    // This calls from the prefs controller
    const accounts = await getAccounts(request);
    response.result = accounts;
    return undefined;
  });
}

export function createGenericJRPCMiddleware<T, U>(
  targetMethod: string,
  handler: (req: JRPCRequest<T>) => Promise<U>
): JRPCMiddleware<unknown, unknown> {
  return createAsyncMiddleware<T, unknown>(async (request, response, next) => {
    const { method } = request;
    if (method !== targetMethod) return next();

    if (!handler) throw new Error(`WalletMiddleware - ${targetMethod} not provided`);

    const result = await handler(request);

    response.result = result;
    return undefined;
  });
}

export function createXRPLMiddleware(providerHandlers: IProviderHandlers): JRPCMiddleware<unknown, unknown> {
  const { getAccounts, submitTransaction, signTransaction, signMessage, getKeyPair, getPublicKey, getBalance } = providerHandlers;

  return mergeMiddleware([
    createGetAccountsMiddleware({ getAccounts }),
    createGenericJRPCMiddleware<{ transaction: Transaction; multisign: string | boolean }, { tx_blob: string; hash: string }>(
      RPC_METHODS.SIGN_TRANSACTION,
      signTransaction
    ),
    createGenericJRPCMiddleware<{ transaction: Transaction }, SubmitResponse>(RPC_METHODS.SUBMIT_TRANSACTION, submitTransaction),
    createGenericJRPCMiddleware<{ message: string }, { signature: string }>(RPC_METHODS.SIGN_MESSAGE, signMessage),
    createGenericJRPCMiddleware<void, KeyPair>(RPC_METHODS.GET_KEY_PAIR, getKeyPair),
    createGenericJRPCMiddleware<void, string>(RPC_METHODS.GET_PUBLIC_KEY, getPublicKey),
    createGenericJRPCMiddleware<void, string>(RPC_METHODS.GET_XRP_BALANCE, getBalance),
  ]);
}
