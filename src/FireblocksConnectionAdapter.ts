import fs from "fs";
import {
  Connection,
  PublicKey,
  SendOptions,
  Commitment,
  SignatureResult,
  RpcResponseAndContext,
  Transaction
} from "@solana/web3.js";

import {
  CreateTransactionResponse,
  FeeLevel,
  FireblocksSDK,
  PeerType,
  TransactionArguments,
  TransactionOperation,
} from "fireblocks-sdk";
import {
  AssetId,
  FireblocksConnectionAdapterConfig,
  TransactionOrVersionedTransaction,
  Logger
} from "./types";
import { DefaultLogger } from "./logger";
import { waitForSignature } from "./helpers";
import { ASSET_IDS, API_BASE_URLS } from "./types";

/**
 * Fireblocks Solana Web3 Connection Adapter Class
 *
 * Should be instantiated via the static 'create' method
 */
export class FireblocksConnectionAdapter extends Connection {
  private readonly adapterConfig: FireblocksConnectionAdapterConfig;
  private readonly fireblocksApiClient: FireblocksSDK;
  private readonly assetId: AssetId;
  private readonly logger: Logger;
  private devnet: boolean;

  private account: string = '';
  private txNote: string = '';
  private externalTxId: string | null = null;
  private feeLevel: FeeLevel;

  private constructor(
    fireblocksClient: FireblocksSDK,
    endpoint: string,
    config: FireblocksConnectionAdapterConfig,
    commitment?: Commitment,
  ) {
    super(endpoint, { commitment });
    this.fireblocksApiClient = fireblocksClient;
    this.adapterConfig = config;
    this.devnet = config.devnet ?? false;
    this.assetId = this.devnet ? ASSET_IDS.SOLANA_DEVNET : ASSET_IDS.SOLANA_MAINNET;
    this.feeLevel = config.feeLevel || FeeLevel.MEDIUM;
    
    // Create logger with verbose output by default unless silent is true
    const isSilent = config.silent ?? false;
    this.logger = {
      debug: (...args) => !isSilent && console.log('[DEBUG]', ...args),
      info: (...args) => !isSilent && console.log('[INFO]', ...args),
      warn: (...args) => !isSilent && console.warn('[WARN]', ...args),
      error: (...args) => console.error('[ERROR]', ...args),
    };
  }

  private validateConfig(config: FireblocksConnectionAdapterConfig): void {
    if (!config.apiKey || !config.apiSecretPath || !config.vaultAccountId) {
      throw new Error('Missing required configuration parameters');
    }
    
    if (!fs.existsSync(config.apiSecretPath)) {
      throw new Error(`API secret file not found at path: ${config.apiSecretPath}`);
    }
  }

  /**
   * Fireblocks Solana Web3 Connection Adapter factory method
   *
   * @param endpoint - required: solana cluster ('testnet' || 'devnet' || 'mainnet-beta')
   * @param config - required: FireblocksConnectionAdapterConfig
   * @param commitment - optional: The level of commitment desired when querying state ('processed' || 'confirmed' || 'finalized')
   * @returns - FireblocksConnectionAdapter instance
   */
  public static async create(
    endpoint: string,
    config: FireblocksConnectionAdapterConfig,
    commitment?: Commitment,
  ): Promise<FireblocksConnectionAdapter> {
    if (!endpoint) {
      throw new Error('Endpoint is required');
    }

    try {
      const fireblocksSecretKey = await fs.promises.readFile(config.apiSecretPath, "utf-8");
      const fireblocksClient = new FireblocksSDK(
        fireblocksSecretKey,
        config.apiKey,
        API_BASE_URLS.PRODUCTION
      );

      const environment = endpoint.split(".")[1];
      config.devnet = environment === "devnet" || environment === "testnet";

      const adapter = new FireblocksConnectionAdapter(
        fireblocksClient,
        endpoint,
        config,
        commitment,
      );

      await adapter.setAccount(config.vaultAccountId, config.devnet);
      adapter.setExternalTxId(null);

      return adapter;
    } catch (error) {
      throw new Error(`Failed to initialize Fireblocks client: ${error.message}`);
    }
  }

  /**
   * Set transaction note
   * @param txNote - transaction note: string
   */
  public setTxNote(txNote: string): void {
    this.txNote = txNote;
  }

  public getTxNote = (): string => {
    return this.txNote;
  };

  public getConfig = (): FireblocksConnectionAdapterConfig => {
    return this.adapterConfig;
  };

  /**
   * Set External Transaction Identifier
   * @param externalTxId - external transaction identifier: string
   */
  public setExternalTxId = (externalTxId: string | null): void => {
    this.externalTxId = externalTxId;
  };

  /**
   * Get External Transaction Identifier
   * @returns externalITxId - string
   */
  public getExternalTxId = (): string | null => {
    return this.externalTxId;
  };

  private async setAccount(
    vaultAccount: number[] | string[] | string | number,
    devnet: boolean,
  ): Promise<void> {
    try {
      const solWallet = await this.fireblocksApiClient.getDepositAddresses(
        String(vaultAccount),
        devnet ? ASSET_IDS.SOLANA_DEVNET : ASSET_IDS.SOLANA_MAINNET,
      );

      if (!solWallet?.[0]?.address) {
        throw new Error('No wallet address found');
      }

      this.account = solWallet[0].address;
      this.logger.debug('Account set successfully', { address: this.account });
    } catch (error) {
      throw new Error(`Failed to set account: ${(error as Error).message}`);
    }
  }

  /**
   * Get current account's address (the address of the SOL/SOL_TEST wallet in the configured vault account)
   * @returns
   */
  public getAccount = (): string => {
    return this.account;
  };

  private async signWithFireblocks(
    transaction: TransactionOrVersionedTransaction
  ): Promise<CreateTransactionResponse> {
    this.logger.debug('Preparing to sign transaction with Fireblocks', {
      feePayer: this.account,
      feeLevel: this.feeLevel
    });

    try {
      if (!transaction) {
        throw new Error('Transaction is required');
      }

      const serializedTx = transaction.serialize({ requireAllSignatures: false });
            
      const payload: TransactionArguments = {
        assetId: this.assetId,
        operation: "PROGRAM_CALL" as TransactionOperation,
        feeLevel: this.feeLevel,
        source: {
          type: PeerType.VAULT_ACCOUNT,
          id: String(this.adapterConfig.vaultAccountId),
        },
        note: this.txNote || "Created by Solana Web3 Adapter",
        extraParameters: {
          programCallData: Buffer.from(serializedTx).toString("base64")
        }
      };

      if (this.externalTxId) {
        payload.externalTxId = this.externalTxId;
      }

      this.logger.debug('Submitting transaction to Fireblocks', { payload });

      const tx = await this.createFireblocksTransaction(payload);

      this.logger.info('Transaction submitted to Fireblocks', {
        transactionId: tx.id,
        status: tx.status
      });

      return tx;
    } catch (error) {
      throw new Error(`Failed to sign transaction with Fireblocks: ${error.message}`);
    }
  }

  public async confirmTransaction(
    signatureOrConfig: string | { signature: string },
    commitment?: Commitment
  ): Promise<RpcResponseAndContext<SignatureResult>> {
    return {
      context: { slot: 0 },
      value: { err: null }
    };
  }

  public async sendTransaction(
    transaction: TransactionOrVersionedTransaction,
    signers?: { publicKey: PublicKey; secretKey: Uint8Array }[] | SendOptions,
    options?: SendOptions,
  ): Promise<string> {
    try {
      
      
      if (transaction instanceof Transaction) {
        const { blockhash } = await this.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(this.account);
      }
      
      const fbTxResponse = await this.signWithFireblocks(transaction);
      
      this.logger.debug('Waiting for transaction confirmation');
      
      const finalTxResponse = await waitForSignature(
        fbTxResponse,
        this.fireblocksApiClient,
        this.adapterConfig.pollingInterval || 3000,
        this.logger
      );

      if (!finalTxResponse.txHash) {
        throw new Error('Transaction hash not found in Fireblocks response');
      }
      
      this.logger.info('Transaction confirmed', { 
        txHash: finalTxResponse.txHash,
        status: finalTxResponse.status
      });
      
      return finalTxResponse.txHash;
    } catch (error) {
      this.logger.error('Transaction failed', error as Error);
      throw new Error(`Failed to send transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Set transaction fee level
   * @param feeLevel - transaction fee level: "HIGH" | "MEDIUM" | "LOW"
   */
  public setFeeLevel(feeLevel: FeeLevel): void {
    this.feeLevel = feeLevel;
  }

  /**
   * Get current fee level
   * @returns FeeLevel
   */
  public getFeeLevel(): FeeLevel {
    return this.feeLevel;
  }

  // Add protected methods to allow mocking in tests
  protected async createFireblocksTransaction(
    payload: TransactionArguments
  ): Promise<CreateTransactionResponse> {
    return this.fireblocksApiClient.createTransaction(payload);
  }

  protected async getBlockhash(): Promise<string> {
    return (await this.getLatestBlockhash()).blockhash;
  }
}
