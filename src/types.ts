import { Keypair, Transaction } from "@solana/web3.js";
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
 * nonceAccountAddress?: string - If Durable Nonce is required - the nonceAccount public ADDRESS
 *
 * nonceAuthorityKeyPair?: Keypair - If Durable Nonce is required - the nonceAuthority Keypair object - https://solana-labs.github.io/solana-web3.js/classes/Keypair.html
 */
export type FireblocksConnectionAdapterConfig = {
  apiKey: string;
  apiSecretPath: string;
  apiBaseUrl?: ApiBaseUrl | string;
  vaultAccountId: string | number;
  devnet?: boolean;
  pollingInterval?: number;
  nonceAccountAddress?: string;
  nonceAuthorityKeyPair?: Keypair;
};
