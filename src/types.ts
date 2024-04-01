import { Transaction } from "@solana/web3.js";
import type { TransactionResponse, FeeLevel } from "fireblocks-sdk";

export enum ApiBaseUrl {
  Production = "https://api.fireblocks.io",
  Sandbox = "https://sandbox-api.fireblocks.io",
}

export type SignedTransaction = {
  signedTx: Transaction;
  fireblocksSignedTxPayload: TransactionResponse;
};

export enum AssetId {
  SolanaDevnet = "SOL_TEST",
  SolanaMainnet = "SOL",
}

export type FireblocksConnectionAdapterConfig = {
  apiKey: string;
  apiSecretPath: string;
  vaultAccountId: string | number;
  devnet?: boolean;
  feeLevel?: FeeLevel;
  apiBaseUrl?: ApiBaseUrl | string;
  txNote?: string;
  pollingInterval?: number;
  externalTxId?: string
};
