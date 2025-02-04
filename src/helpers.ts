import {
  CreateTransactionResponse,
  FireblocksSDK,
  TransactionResponse,
  TransactionStatus,
} from "fireblocks-sdk";
import { Logger } from "./types";

require("dotenv").config();

const DEFAULT_POLLING_INTERVAL = 2000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const waitForSignature = async (
  tx: CreateTransactionResponse,
  fireblocksApiClient: FireblocksSDK,
  pollingInterval: number = DEFAULT_POLLING_INTERVAL,
  logger?: Logger
): Promise<TransactionResponse> => {
  const failedStatuses = new Set([
    TransactionStatus.BLOCKED,
    TransactionStatus.CANCELLED,
    TransactionStatus.FAILED,
    TransactionStatus.REJECTED,
  ]);

  let retries = 0;
  let txResponse = await fireblocksApiClient.getTransactionById(tx.id);
  let lastStatus = txResponse.status;

  logger?.debug(`Transaction ${txResponse.id} status: ${txResponse.status}`);

  while (
    txResponse.status !== TransactionStatus.COMPLETED &&
    txResponse.status !== TransactionStatus.BROADCASTING
  ) {
    if (failedStatuses.has(txResponse.status)) {
      throw new Error(
        `Transaction ${txResponse.id} failed with status ${txResponse.status} (${txResponse.subStatus})`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollingInterval));

    try {
      txResponse = await fireblocksApiClient.getTransactionById(tx.id);
    } catch (error) {
      if (retries >= MAX_RETRIES) throw error;
      retries++;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      continue;
    }

    if (txResponse.status !== lastStatus) {
      logger?.debug(`Transaction ${txResponse.id} status: ${txResponse.status}`);
      lastStatus = txResponse.status;
    }
  }

  return txResponse;
};

