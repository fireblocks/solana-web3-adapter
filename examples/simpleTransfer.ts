import {
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram, 
  Transaction,
} from "@solana/web3.js";
import { FireblocksConnectionAdapter } from "../src/FireblocksConnectionAdapter";
import { FireblocksConnectionAdapterConfig } from "../src/types";
import someDest from "./keys_examples/someDest";

require("dotenv").config();

const main = async () => {
  const transaction = new Transaction();

  const fireblocksConnectionConfig: FireblocksConnectionAdapterConfig = {
    apiKey: process.env.FIREBLOCKS_API_KEY,
    apiSecretPath: process.env.FIREBLOCKS_SECRET_KEY_PATH,
    vaultAccountId: 0,
  };

  const connection = await FireblocksConnectionAdapter.create(
    clusterApiUrl("devnet"),
    fireblocksConnectionConfig,
  );

  const accountPublicKey = new PublicKey(connection.getAccount());
  const recipientSecretKey = Uint8Array.from(Buffer.from(someDest, "base64"));
  const recipient = Keypair.fromSecretKey(recipientSecretKey);

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: accountPublicKey,
      toPubkey: recipient.publicKey,
      lamports: LAMPORTS_PER_SOL * 0.1,
    }),
  );

  connection.setTxNote(
    "This is a simple transfer with Fireblocks Connection Adapter",
  );

  try {
    const txHash = await sendAndConfirmTransaction(connection, transaction, []);
    console.log(
      `Transaction sent: https://explorer.solana.com/tx/${txHash}?cluster=devnet`,
    );
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
};

main();
