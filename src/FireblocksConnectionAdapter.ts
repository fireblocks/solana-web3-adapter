import fs from "fs";
import {
  Connection,
  PublicKey,
  Transaction,
  SendOptions,
  VersionedTransaction,
  Commitment,
  LAMPORTS_PER_SOL,
  NonceAccount,
  SystemProgram,
} from "@solana/web3.js";

import {
  FireblocksSDK,
  PeerType,
  TransactionArguments,
  TransactionOperation,
} from "fireblocks-sdk";
import {
  ApiBaseUrl,
  AssetId,
  FireblocksConnectionAdapterConfig,
  SignedTransaction,
} from "./types";
import { waitForSignature } from "./helpers";

/**
 * Fireblocks Solana Web3 Connection Adapter Class
 *
 * Should be instantiated via the static 'create' method
 */
export class FireblocksConnectionAdapter extends Connection {
  private adapterConfig: FireblocksConnectionAdapterConfig;
  private fireblocksApiClient: FireblocksSDK;
  private account: string;
  private assetId: AssetId;
  private devnet: boolean;
  private txNote: string;
  private externalTxId: string | null;

  private constructor(
    fireblocksClient: FireblocksSDK,
    endpoint: string,
    config: FireblocksConnectionAdapterConfig,
    commitment?: Commitment,
  ) {
    super(endpoint, { commitment });
    this.fireblocksApiClient = fireblocksClient;
    this.adapterConfig = config;
    this.devnet = config.devnet ? true : false;
    this.assetId = this.adapterConfig.devnet
      ? AssetId.SolanaDevnet
      : AssetId.SolanaMainnet;
  }

  /**
   * Fireblocks Solana Web3 Connection Adapter factory method
   *
   * @param endpoint - required: solana cluster ('testnet' || 'devnet' || 'mainnet-beta')
   * @param config - required: FireblocksConnectionAdapterConfig
   * @param commitment - optional: The level of commitment desired when querying state ('processed' || 'confirmed' || 'finalized')
   * @returns - FireblocksConnectionAdapter instance
   */
  public static create = async (
    endpoint: string,
    config: FireblocksConnectionAdapterConfig,
    commitment?: Commitment,
  ): Promise<FireblocksConnectionAdapter> => {
    if (
      Boolean(config.nonceAccountAddress) !==
      Boolean(config.nonceAuthorityKeyPair)
    ) {
      throw new Error(
        "Both nonce account address and nonce authority keypair should be provided if one is provided",
      );
    }

    const fireblocksSecretKey = fs.readFileSync(config.apiSecretPath, "utf-8");
    const fireblocksClient = new FireblocksSDK(
      fireblocksSecretKey,
      config.apiKey,
      config.apiBaseUrl || ApiBaseUrl.Production,
    );

    const environment = endpoint.split(".")[1];
    if (environment === "devnet" || environment === "testnet") {
      config.devnet = true;
    }

    const adapter = new FireblocksConnectionAdapter(
      fireblocksClient,
      endpoint,
      config,
      commitment,
    );

    await adapter.setAccount(config.vaultAccountId, config.devnet);
    adapter.setExternalTxId(null);

    return adapter;
  };

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
  public getExternalTxId = (): string => {
    return this.externalTxId;
  };

  private setAccount = async (
    vaultAccount: number[] | string[] | string | number,
    devnet: boolean,
  ) => {
    const solWallet = await this.fireblocksApiClient.getDepositAddresses(
      String(vaultAccount),
      devnet ? AssetId.SolanaDevnet : AssetId.SolanaMainnet,
    );

    this.account = solWallet[0].address;
  };

  /**
   * Get current account's address (the address of the SOL/SOL_TEST wallet in the configured vault account)
   * @returns
   */
  public getAccount = (): string => {
    return this.account;
  };

  private signWithFireblocks = async (
    transaction: Transaction,
    amount: Number | null,
    payer: string,
  ): Promise<SignedTransaction> => {
    if (
      this.adapterConfig.nonceAuthorityKeyPair &&
      this.adapterConfig.nonceAccountAddress &&
      !amount
    ) {
      transaction.instructions.unshift(
        SystemProgram.nonceAdvance({
          noncePubkey: new PublicKey(this.adapterConfig.nonceAccountAddress),
          authorizedPubkey: this.adapterConfig.nonceAuthorityKeyPair.publicKey,
        }),
      );

      transaction.partialSign(this.adapterConfig.nonceAuthorityKeyPair);
    }

    const messageToSign = transaction.serializeMessage();

    const txNote = this.getTxNote();
    const payload: TransactionArguments = {
      assetId: this.assetId,
      operation: amount
        ? TransactionOperation.TRANSFER
        : TransactionOperation.RAW,
      source: {
        type: PeerType.VAULT_ACCOUNT,
        id: String(this.adapterConfig.vaultAccountId),
      },
      note: txNote || "Created by Solana Web3 Adapter",
    };

    this.externalTxId ? (payload.externalTxId = this.externalTxId) : null;

    if (!amount) {
      payload.extraParameters = {
        rawMessageData: {
          messages: [
            {
              content: messageToSign.toString("hex"),
            },
          ],
        },
      };
    } else {
      payload.destination = {
        type: PeerType.ONE_TIME_ADDRESS,
        oneTimeAddress: {
          address: transaction.instructions[0].keys[1].pubkey.toBase58(),
        },
      };
      payload.amount = amount as number;
    }

    console.log(
      `Sending the following payload to Fireblocks:\n${JSON.stringify(payload, null, 2)}`,
    );

    const signature = await this.fireblocksApiClient.createTransaction(payload);
    const fireblocksSignedTxPayload = await waitForSignature(
      signature,
      this.fireblocksApiClient,
      this.adapterConfig.pollingInterval,
    );

    if (!amount) {
      transaction.addSignature(
        new PublicKey(payer),
        Buffer.from(
          fireblocksSignedTxPayload.signedMessages[0].signature.fullSig,
          "hex",
        ),
      );
    }

    return {
      signedTx: transaction,
      fireblocksSignedTxPayload,
    };
  };

  public async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    signers?: { publicKey: PublicKey; secretKey: Uint8Array }[] | SendOptions,
    options?: SendOptions,
  ): Promise<string> {
    if (transaction instanceof Transaction) {
      let amount = null;

      // Add recent blockhash if does not exist
      if (
        !transaction.recentBlockhash &&
        this.adapterConfig.nonceAuthorityKeyPair &&
        !amount
      ) {
        const nonceAccountInfo = (
          await this.getAccountInfo(
            new PublicKey(this.adapterConfig.nonceAccountAddress),
          )
        ).data;
        const nonceAccountHash =
          NonceAccount.fromAccountData(nonceAccountInfo).nonce;
        transaction.recentBlockhash = nonceAccountHash;
      } else {
        const { blockhash } = await this.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
      }

      // Add self as feePayer
      transaction.feePayer = new PublicKey(this.account);

      //Check if tx has 1 instruction and it is a basic transfer
      if (
        transaction.instructions.length == 1 &&
        transaction.instructions[0].data[0] === 2
      ) {
        const dataView = new DataView(
          transaction.instructions[0].data.buffer,
          transaction.instructions[0].data.byteOffset,
          transaction.instructions[0].data.byteLength,
        );

        amount = Number(dataView.getBigUint64(4, true)) / LAMPORTS_PER_SOL;
      }

      const { txHash } = (
        await this.signWithFireblocks(transaction, amount, this.account)
      ).fireblocksSignedTxPayload;

      if (Array.isArray(signers)) {
        signers?.forEach((signer) => {
          transaction.partialSign(signer);
        });
      }

      if (!txHash) {
        return super.sendRawTransaction(transaction.serialize());
      }
      return txHash;
    } else {
      throw new Error("Versioned Transactions are not yet supported");
    }
  }
}
