import fs from "fs";
import {
  Connection,
  PublicKey,
  Transaction,
  SendOptions,
  VersionedTransaction,
  Commitment,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
  FireblocksSDK
} from "fireblocks-sdk";
import {
  ApiBaseUrl,
  AssetId,
  FireblocksConnectionAdapterConfig
} from "./types";
import { signWithFireblocks } from "./helpers";

export class FireblocksConnectionAdapter extends Connection {
  private adapterConfig: FireblocksConnectionAdapterConfig;
  private fireblocksApiClient: FireblocksSDK;
  private account: string;
  private assetId: AssetId;
  private devnet: boolean;

  private constructor(
    fireblocksClient: FireblocksSDK,
    endpoint: string,
    config: FireblocksConnectionAdapterConfig,
    commitment?: Commitment,
  ) {
    super(endpoint, { commitment });
    this.fireblocksApiClient = fireblocksClient;
    this.adapterConfig = config;
    this.adapterConfig.devnet = config.devnet ? false : true;
    this.assetId = this.adapterConfig.devnet
      ? AssetId.SolanaDevnet
      : AssetId.SolanaMainnet;
  }

  // Static factory method
  public static async create(
    config: FireblocksConnectionAdapterConfig,
    endpoint: string,
    commitment?: Commitment,
  ): Promise<FireblocksConnectionAdapter> {
    const fireblocksSecretKey = fs.readFileSync(config.apiSecretPath, "utf-8");
    const fireblocksClient = new FireblocksSDK(
      fireblocksSecretKey,
      config.apiKey,
      config.apiBaseUrl || ApiBaseUrl.Production,
    );

    const adapter = new FireblocksConnectionAdapter(
      fireblocksClient,
      endpoint,
      config,
      commitment,
    );

    config.devnet = false;
    const environment = endpoint.split(".")[1];
    if (environment === "devnet") {
      config.devnet = true;
    } else if (environment !== "mainnet-beta") {
      throw new Error(
        `${environment} is not supported. Please use 'devnet' or 'mainnet-beta' only.`,
      );
    }

    await adapter.setAccount(config.vaultAccountId, config.devnet);
    await adapter.setDevnet(config.devnet);

    return adapter;
  }

  private async setDevnet(devnet: boolean) {
    this.devnet = devnet;
  }

  private async setAccount(
    vaultAccount: number[] | string[] | string | number,
    devnet: boolean,
  ) {
    const solWallet = await this.fireblocksApiClient.getDepositAddresses(
      String(vaultAccount),
      devnet ? AssetId.SolanaDevnet : AssetId.SolanaMainnet,
    );

    this.account = solWallet[0].address;
  }

  public getAccount(): string {
    return this.account;
  }

  public async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    signers?: { publicKey: PublicKey; secretKey: Uint8Array }[] | SendOptions,
    options?: SendOptions,
  ): Promise<string> {
    if (transaction instanceof Transaction) {
      //Check if tx instruction is a basic transfer
      if (transaction.instructions[0].data[0] === 2) {
        const dataView = new DataView(
          transaction.instructions[0].data.buffer,
          transaction.instructions[0].data.byteOffset,
          transaction.instructions[0].data.byteLength,
        );
        const amount =
          Number(dataView.getBigUint64(4, true)) / LAMPORTS_PER_SOL;

        const { txHash } = (
          await signWithFireblocks(
            transaction,
            this.fireblocksApiClient,
            false,
            this.assetId,
            this.adapterConfig.vaultAccountId,
            this.account,
            this.adapterConfig.pollingInterval,
            amount,
            this.adapterConfig.txNote,
            this.adapterConfig.externalTxId
          )
        ).fireblocksSignedTxPayload;

        return txHash;
      } else {
        console.log("Unsupported operation - using Fireblocks RAW signing");
        await signWithFireblocks(
          transaction,
          this.fireblocksApiClient,
          true,
          this.assetId,
          this.adapterConfig.vaultAccountId,
          this.account,
          this.adapterConfig.pollingInterval,
          null,
          this.adapterConfig.txNote,
          this.adapterConfig.externalTxId
        );
        return super.sendRawTransaction(transaction.serialize());
      }
    } else {
      throw new Error("Unsupported transaction type.");
    }
  }
}
