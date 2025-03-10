import {
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  StakeProgram,
  Authorized,
  Transaction,
  Keypair,
} from "@solana/web3.js";

import { 
  FireblocksConnectionAdapter, 
  FireblocksConnectionAdapterConfig, 
  FeeLevel } 
from "../src";

require("dotenv").config();



const main = async () => {
  const transaction = new Transaction();
  const validatorVoteAccount = "FwR3PbjS5iyqzLiLugrBqKSa5EKZ4vK9SKs7eQXtT59f";

  const fireblocksConnectionConfig: FireblocksConnectionAdapterConfig = {
    apiKey: process.env.FIREBLOCKS_API_KEY || "",
    apiSecretPath: process.env.FIREBLOCKS_SECRET_KEY_PATH || "",
    vaultAccountId: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID || "",
    feeLevel: FeeLevel.HIGH,
    silent: false,
    devnet: true
  };

  const connection = await FireblocksConnectionAdapter.create(
    clusterApiUrl("devnet"),
    fireblocksConnectionConfig,
  );

  const selectedValidatorPubkey = new PublicKey(validatorVoteAccount);
  const accountPublicKey = new PublicKey(connection.getAccount());

  transaction.feePayer = accountPublicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  // Create a keypair for our stake account
  const stakeAccount = Keypair.generate();
  console.log("stake account public key:", stakeAccount.publicKey.toBase58());

  // 1. Add create account instruction
  transaction.add(StakeProgram.createAccount({
    authorized: new Authorized(accountPublicKey, accountPublicKey),
    fromPubkey: accountPublicKey,
    lamports: LAMPORTS_PER_SOL * 0.01,
    stakePubkey: stakeAccount.publicKey,
  }));

  // 2. Add delegate instruction
  transaction.add(StakeProgram.delegate({
    stakePubkey: stakeAccount.publicKey,
    authorizedPubkey: accountPublicKey,
    votePubkey: selectedValidatorPubkey,
  }));

  connection.setTxNote(
    "This is to create a stake account and a delegate instruction for given vault account",
  );

  //Partial sign the transaction with the stake account
  transaction.partialSign(stakeAccount);

  try {
    const txHash = await sendAndConfirmTransaction(connection, transaction, []);

    console.log(
      `Transaction sent: https://explorer.solana.com/tx/${txHash}?cluster=devnet`,
    );

    console.log(`Stake account created. Tx Id: ${txHash}`);
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
};

main();  

/*
Another option would be - Insteaf of doing partial sign, we can just pass the stake account 
to the sendAndConfirmTransaction function as a signer



<---- CODE EXAMPLE ---->

const main = async () => {
  const transaction = new Transaction();
  const validatorVoteAccount = "FwR3PbjS5iyqzLiLugrBqKSa5EKZ4vK9SKs7eQXtT59f";

  const fireblocksConnectionConfig: FireblocksConnectionAdapterConfig = {
    apiKey: process.env.FIREBLOCKS_API_KEY || "",
    apiSecretPath: process.env.FIREBLOCKS_SECRET_KEY_PATH || "",
    vaultAccountId: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID || "",
    feeLevel: FeeLevel.HIGH,
    silent: false,
    devnet: true
  };

  const connection = await FireblocksConnectionAdapter.create(
    clusterApiUrl("devnet"),
    fireblocksConnectionConfig,
  );

  const selectedValidatorPubkey = new PublicKey(validatorVoteAccount);
  const accountPublicKey = new PublicKey(connection.getAccount());


  // Create a keypair for our stake account
  const stakeAccount = Keypair.generate();
  console.log("stake account public key:", stakeAccount.publicKey.toBase58());

  // 1. Add create account instruction
  transaction.add(StakeProgram.createAccount({
    authorized: new Authorized(accountPublicKey, accountPublicKey),
    fromPubkey: accountPublicKey,
    lamports: LAMPORTS_PER_SOL * 0.01,
    stakePubkey: stakeAccount.publicKey,
  }));

  // 2. Add delegate instruction
  transaction.add(StakeProgram.delegate({
    stakePubkey: stakeAccount.publicKey,
    authorizedPubkey: accountPublicKey,
    votePubkey: selectedValidatorPubkey,
  }));

  connection.setTxNote(
    "This is to create a stake account and a delegate instruction for given vault account",
  );

  try {
    const txHash = await sendAndConfirmTransaction(connection, transaction, [stakeAccount]);

    console.log(
      `Transaction sent: https://explorer.solana.com/tx/${txHash}?cluster=devnet`,
    );

    console.log(`Stake account created. Tx Id: ${txHash}`);
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
};

main();  



*/