import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { TransactionResponse, FeeLevel } from "fireblocks-sdk";
export { FeeLevel } from "fireblocks-sdk";

export type TransactionOrVersionedTransaction = Transaction | VersionedTransaction;

export const API_BASE_URLS = {
  PRODUCTION: "https://api.fireblocks.io",
  SANDBOX: "https://sandbox-api.fireblocks.io",
} as const;

export type ApiBaseUrl = typeof API_BASE_URLS[keyof typeof API_BASE_URLS];

export type SignedTransaction = {
  readonly signedTx: Transaction;
  readonly fireblocksSignedTxPayload: TransactionResponse;
};

export const ASSET_IDS = {
  SOLANA_DEVNET: "SOL_TEST",
  SOLANA_MAINNET: "SOL",
} as const;

export type AssetId = typeof ASSET_IDS[keyof typeof ASSET_IDS];

/**
 * apiKey: string - Fireblocks API Key
 *
 * apiSecretPath: string - Fireblocks API Secret key file PATH
 *
 * apiBaseUrl?: ApiBaseUrl | string - Fireblocks API Base URL - default production
 *
 * vaultAccountId: string | number - Fireblocks Vault Account ID
 *
 * pollingInterval?: number - Fireblocks API polling interval for tx status updates
 * 
 * feeLevel?: LOW | MEDIUM | HIGH - Fee level to use for transactions
 */
export interface FireblocksConnectionAdapterConfig {
  readonly apiKey: string;
  readonly apiSecretPath: string;
  readonly apiBaseUrl?: ApiBaseUrl | string;
  readonly vaultAccountId: string | number;
  devnet?: boolean;
  readonly pollingInterval?: number;
  readonly feeLevel?: FeeLevel;
  readonly logger?: Logger;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
  readonly silent?: boolean;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}
