import {
  Keypair,
  NONCE_ACCOUNT_LENGTH,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  CreateTransactionResponse,
  FireblocksSDK,
  TransactionResponse,
  TransactionStatus,
} from "fireblocks-sdk";
import { writeFileSync } from "fs";
import { FireblocksConnectionAdapter } from "./FireblocksConnectionAdapter";

require("dotenv").config();

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

/**
 * Create a nonce account and nonce authority while the fee payer is your configured Fireblocks Vault Account.
 *
 * The nonce authority keypair is created locally in nonceInfo.ts file.
 *
 * @param connection - FireblocksConnectionAdapter instance
 */
export const createNonceAccountAndAuthority = async (
  connection: FireblocksConnectionAdapter,
) => {
  const feePayerAddress = await connection.getAccount();
  console.log(feePayerAddress);
  const feePayer = new PublicKey(feePayerAddress);
  console.log(feePayer);
  let nonceAccount = Keypair.generate();
  let nonceAuthority = Keypair.generate();

  writeFileSync(
    "./nonceInfo.ts",
    `export const nonceAccountAddress = "${nonceAccount.publicKey.toBase58()}";\nexport const nonceAuthorityPrivateKey = [${nonceAuthority.secretKey}]`,
  );
  console.log(
    "Saved Nonce Account and Nonce Authority data to nonceInfo.ts file",
  );

  let tx = new Transaction();
  tx.add(
    // create nonce account
    SystemProgram.createAccount({
      fromPubkey: feePayer,
      newAccountPubkey: nonceAccount.publicKey,
      lamports:
        await connection.getMinimumBalanceForRentExemption(
          NONCE_ACCOUNT_LENGTH,
        ),
      space: NONCE_ACCOUNT_LENGTH,
      programId: SystemProgram.programId,
    }),
    // init nonce account
    SystemProgram.nonceInitialize({
      noncePubkey: nonceAccount.publicKey,
      authorizedPubkey: nonceAuthority.publicKey,
    }),
  );

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = feePayer;

  tx.partialSign(nonceAccount);

  try {
    const txHash = await sendAndConfirmTransaction(connection, tx, []);
    console.log(
      `Transaction sent: https://explorer.solana.com/tx/${txHash}?cluster=devnet`,
    );
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
};
