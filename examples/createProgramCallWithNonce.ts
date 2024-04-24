import {
  clusterApiUrl,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
  TransactionInstruction,
} from "@solana/web3.js";
import { FireblocksConnectionAdapter } from "../src/FireblocksConnectionAdapter";
import { FireblocksConnectionAdapterConfig } from "../src/types";
import { nonceAccountAddress, nonceAuthorityPrivateKey } from "./nonceInfo";

require("dotenv").config();

const main = async () => {
  const transaction = new Transaction();
  const nonceAuthority = Keypair.fromSecretKey(
    Uint8Array.from(nonceAuthorityPrivateKey),
  );

  const fireblocksConnectionConfig: FireblocksConnectionAdapterConfig = {
    apiKey: process.env.FIREBLOCKS_API_KEY,
    apiSecretPath: process.env.FIREBLOCKS_SECRET_KEY_PATH,
    vaultAccountId: 0,
    nonceAccountAddress,
    nonceAuthorityKeyPair: nonceAuthority,
  };

  const connection = await FireblocksConnectionAdapter.create(
    clusterApiUrl("devnet"),
    fireblocksConnectionConfig,
  );

  const programId = new PublicKey(
    "DcwqLAaLEzgRvpQB62XSr9e4pWvvnBJQjeBenBGNVHPP",
  );

  transaction.add(
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
};

main();
