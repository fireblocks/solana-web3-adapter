import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { FireblocksConnectionAdapter } from "../src";
import { FireblocksConnectionAdapterConfig } from "../src";

require("dotenv").config();

async function helloWorldProgram() {
  const programId = new PublicKey(
    "DcwqLAaLEzgRvpQB62XSr9e4pWvvnBJQjeBenBGNVHPP",
  );

  const fireblocksConnectionConfig: FireblocksConnectionAdapterConfig = {
    apiKey: process.env.FIREBLOCKS_API_KEY,
    apiSecretPath: process.env.FIREBLOCKS_SECRET_KEY_PATH,
    vaultAccountId: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID,
  };

  const connection = await FireblocksConnectionAdapter.create(
    clusterApiUrl("devnet"),
    fireblocksConnectionConfig,
  );

  const transaction = new Transaction().add(
    new TransactionInstruction({
      keys: [],
      programId: programId,
    }),
  );

  try {
    const txHash = await sendAndConfirmTransaction(connection, transaction, []);
    console.log(
      `Transaction sent: https://explorer.solana.com/tx/${txHash}?cluster=devnet`,
    );
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
}

helloWorldProgram();
