import { PublicKey, Transaction } from "@solana/web3.js";
import {
  CreateTransactionResponse,
  FireblocksSDK,
  PeerType,
  TransactionArguments,
  TransactionOperation,
  TransactionResponse,
  TransactionStatus,
} from "fireblocks-sdk";
import { AssetId, SignedTransaction } from "./types";

export const waitForSignature = async (
  tx: CreateTransactionResponse,
  fireblocksApiClient: FireblocksSDK,
  pollingInterval?: number,
): Promise<TransactionResponse | undefined> => {
  let txResponse = await fireblocksApiClient.getTransactionById(tx.id);
  let lastStatus = txResponse.status;

  console.log(
    `Transaction ${txResponse.id} is currently at status - ${txResponse.status}`,
  );

  while (
    txResponse.status !== TransactionStatus.COMPLETED &&
    txResponse.status !== TransactionStatus.BROADCASTING
  ) {
    await new Promise((resolve) =>
      setTimeout(resolve, pollingInterval || 2000),
    );

    txResponse = await fireblocksApiClient.getTransactionById(tx.id);

    if (txResponse.status !== lastStatus) {
      console.log(
        `Transaction ${txResponse.id} is currently at status - ${txResponse.status}`,
      );
      lastStatus = txResponse.status;
    }

    switch (txResponse.status) {
      case TransactionStatus.BLOCKED:
      case TransactionStatus.CANCELLED:
      case TransactionStatus.FAILED:
      case TransactionStatus.REJECTED:
        throw new Error(
          `Signing request failed/blocked/cancelled: Transaction: ${txResponse.id} status is ${txResponse.status}\nSub-Status: ${txResponse.subStatus}`,
        );
      default:
        break;
    }
  }

  return txResponse;
};

export const signWithFireblocks = async (
  transaction: Transaction,
  fireblocksApiClient: FireblocksSDK,
  rawSigning: boolean,
  assetId: AssetId,
  vaultAccountId: string | number,
  payer: string,
  pollingInterval?: number,
  amount?: Number,
  txNote?: string,
  externalTxId?: string
): Promise<SignedTransaction> => {
  const messageToSign = transaction.serializeMessage();
  const payload: TransactionArguments = {
    assetId: assetId,
    operation: rawSigning
      ? TransactionOperation.RAW
      : TransactionOperation.TRANSFER,
    source: {
      type: PeerType.VAULT_ACCOUNT,
      id: String(vaultAccountId),
    },
    note: txNote || "Created by Solana Web3 Adapter",
    externalTxId: externalTxId || null
  };

  if (rawSigning) {
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

  const signature = await fireblocksApiClient.createTransaction(payload);
  const signedTx = await waitForSignature(
    signature,
    fireblocksApiClient,
    pollingInterval,
  );

  if (rawSigning) {
    transaction.addSignature(
      new PublicKey(payer),
      Buffer.from(signedTx.signedMessages[0].signature.fullSig, "hex"),
    );
  }

  return {
    signedTx: transaction,
    fireblocksSignedTxPayload: signedTx,
  };
};
