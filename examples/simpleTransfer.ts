import {
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram, 
  Transaction
} from "@solana/web3.js";
import { FireblocksConnectionAdapter, FireblocksConnectionAdapterConfig, FeeLevel } from "../src";


const someDest = "3kz72p8F8xjJ5re6uNsUNhULCpZXy1GU9eaBkzqg2Ctq";

require("dotenv").config();

const main = async () => {
  const transaction = new Transaction();

  const fireblocksConnectionConfig: FireblocksConnectionAdapterConfig = {
    apiKey: process.env.FIREBLOCKS_API_KEY,
    apiSecretPath: process.env.FIREBLOCKS_SECRET_KEY_PATH,
    vaultAccountId: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID,
    feeLevel: FeeLevel.HIGH,
    silent: true,
  };

  const connection = await FireblocksConnectionAdapter.create(
    clusterApiUrl("mainnet-beta"),
    fireblocksConnectionConfig,
  );

  const accountPublicKey = new PublicKey(connection.getAccount());
  const recipient = new PublicKey(someDest);

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: accountPublicKey,
      toPubkey: recipient,
      lamports: LAMPORTS_PER_SOL * 0.01,
    }),
  );

  connection.setTxNote(
    "This is a simple transfer with Fireblocks Connection Adapter",
  );

  try {
    const txHash = await sendAndConfirmTransaction(connection, transaction, []);
    console.log(
      `Transaction sent: https://explorer.solana.com/tx/${txHash}`,
    );
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
};

main();
