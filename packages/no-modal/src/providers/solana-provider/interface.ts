import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import BN from "bn.js";

import { RequestArguments } from "@/core/base";

import { InjectedProvider } from "./providers";

export type TransactionOrVersionedTransaction = Transaction | VersionedTransaction;

export interface ISolanaWallet {
  publicKey?: { toBytes(): Uint8Array };
  signAndSendTransaction<T extends TransactionOrVersionedTransaction>(transaction: T): Promise<{ signature: string }>;
  signTransaction?<T extends TransactionOrVersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions?<T extends TransactionOrVersionedTransaction>(transactions: T[]): Promise<T[]>;
  signMessage(message: Uint8Array, display?: string): Promise<Uint8Array>;
  request<T, U>(args: RequestArguments<T>): Promise<U>;
}

export interface IBaseWalletProvider {
  publicKey?: { toBytes(): Uint8Array };
  signMessage?(message: Uint8Array, display?: "hex" | "utf8"): Promise<{ signature: Uint8Array; publicKey: BN }>;
  signTransaction?<T extends TransactionOrVersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions?<T extends TransactionOrVersionedTransaction>(transactions: T[]): Promise<T[]>;
  signAndSendTransaction?<T extends TransactionOrVersionedTransaction>(transaction: T): Promise<{ signature: string }>;
}

export interface ITorusWalletProvider extends InjectedProvider {
  sendTransaction<T extends TransactionOrVersionedTransaction>(transaction: T): Promise<string>;
  signTransaction<T extends TransactionOrVersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends TransactionOrVersionedTransaction>(transactions: T[]): Promise<T[]>;
  signMessage(data: Uint8Array): Promise<Uint8Array>;
}

export interface IWalletStandardProviderHandler extends IBaseWalletProvider {}
