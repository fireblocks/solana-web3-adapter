import {
  Keypair,
  Transaction,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  Account,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";

import { FireblocksConnectionAdapter } from "../src/FireblocksConnectionAdapter";
import { FireblocksConnectionAdapterConfig } from "../src/types";

// Just some destination key pair of my own.
// Can be replaced with any other pubkey.
const someDest = "B8jtFhfAVTfk7Skr9iNNtYuH5x8RCebTHQ8WA6QYA5rT";

// ATA for my token
const MY_ASSOCIATED_TOKEN_ACCOUNT = "Ae23tVpsc5F3QwXhPNQPh2r5xaUHQ93roNPdKJCkS5nH"

// My Token mint account
const TOKEN_MINT = "31bmvb4L8Rs8k46aRwbjj9ZBHB6U6fkEES5LawKubohT"

require("dotenv").config();


(async () => {
  
  const from = new PublicKey(MY_ASSOCIATED_TOKEN_ACCOUNT); // My associated token account
  const mintPubkey = new PublicKey(TOKEN_MINT);

  const fireblocksConnectionConfig: FireblocksConnectionAdapterConfig = {
    apiKey: process.env.FIREBLOCKS_API_KEY,
    apiSecretPath: process.env.FIREBLOCKS_SECRET_KEY_PATH,
    vaultAccountId: 55,
  };

  const connection = await FireblocksConnectionAdapter.create(
    clusterApiUrl("devnet"),
    fireblocksConnectionConfig
  );

  // Getting the connected vault account address
  const feePayer = await connection.getAccount();

  // Defining the transfer's destination
  const toAddress = new PublicKey(someDest)
  
  let tx = new Transaction();
  let account: Account;
  
  // Get associated token account address (deterministic)
  const ata = await getAssociatedTokenAddress(
    mintPubkey, // mint account publicKey
    toAddress // owner of the new associated token account
  );
  
  // Try to get an associated token account with the given address and create if does not exist
  try {
    account = await getAccount(connection, ata);
  } catch (error: unknown) {
    if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
      tx.add(createAssociatedTokenAccountInstruction(
        new PublicKey(feePayer), // fee payer
        ata, // ata
        toAddress, // owner of the new associated token account
        mintPubkey // mint public key
      ))
    } else {
      throw new Error(`Error when tried to get the associated token account: ${error}`)
    }
  }

  tx.add(
    createTransferCheckedInstruction(
      from, // from associated token account
      mintPubkey, // mint account publicKey
      ata, // to associated token account
      new PublicKey(feePayer), // associated token account owner
      10, // amount
      0 // decimals
    )
  );
  console.log(`txhash: ${await connection.sendTransaction(tx)}`);
})();
