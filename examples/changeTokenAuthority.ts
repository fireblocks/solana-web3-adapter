import {
  clusterApiUrl,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  AuthorityType,
  createSetAuthorityInstruction
} from "@solana/spl-token";
import { FireblocksConnectionAdapter, FireblocksConnectionAdapterConfig, FeeLevel } from "../src";

require("dotenv").config();

const main = async () => {
  console.log("Starting token authority transfer process...");
  
  if(!process.env.FIREBLOCKS_VAULT_ACCOUNT_ID || !process.env.FIREBLOCKS_NEW_AUTHORITY_VAULT_ID) {
    throw new Error("Fireblocks vault account IDs are not set in the environment variables.");
  }
  
  // Configure connection to source vault account
  const sourceFireblocksConnectionConfig: FireblocksConnectionAdapterConfig = {
    apiKey: process.env.FIREBLOCKS_API_KEY,
    apiSecretPath: process.env.FIREBLOCKS_API_SECRET_PATH,
    vaultAccountId: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID,
    feeLevel: FeeLevel.HIGH,
    silent: false,
  };

  // Configure connection to destination vault account
  const destFireblocksConnectionConfig: FireblocksConnectionAdapterConfig = {
    apiKey: process.env.FIREBLOCKS_API_KEY,
    apiSecretPath: process.env.FIREBLOCKS_API_SECRET_PATH,
    vaultAccountId: process.env.FIREBLOCKS_NEW_AUTHORITY_VAULT_ID,
    feeLevel: FeeLevel.HIGH,
    silent: false,
  };


  // Create connections
  const sourceConnection = await FireblocksConnectionAdapter.create(
    clusterApiUrl("mainnet-beta"),
    sourceFireblocksConnectionConfig,
  );
  
  const destConnection = await FireblocksConnectionAdapter.create(
    clusterApiUrl("mainnet-beta"),
    destFireblocksConnectionConfig,
  );

  // Get public keys for source and destination
  const sourcePublicKey = new PublicKey(sourceConnection.getAccount());
  const newAuthorityPublicKey = new PublicKey(destConnection.getAccount());
  
  console.log(`Source wallet: ${sourcePublicKey.toString()}`);
  console.log(`New authority wallet: ${newAuthorityPublicKey.toString()}`);

  // Get all token accounts owned by source wallet
  console.log("Fetching token accounts...");
  const tokenAccounts = await sourceConnection.getTokenAccountsByOwner(
    sourcePublicKey,
    { programId: TOKEN_PROGRAM_ID }
  );

  console.log(`Found ${tokenAccounts.value.length} token accounts`);

  // Create a single transaction with all instructions
  const transaction = new Transaction();
  const tokenAccountsProcessed = [];

  // Add instructions for all token accounts to the transaction
  for (let i = 0; i < tokenAccounts.value.length; i++) {
    const tokenAccount = tokenAccounts.value[i];
    const tokenAccountPubkey = tokenAccount.pubkey;
    
    console.log(`Adding instruction for token account ${i+1}/${tokenAccounts.value.length}: ${tokenAccountPubkey.toString()}`);
    
    // Add set authority instruction to change the "owner" authority
    transaction.add(
      createSetAuthorityInstruction(
        tokenAccountPubkey,
        sourcePublicKey,
        AuthorityType.AccountOwner,
        newAuthorityPublicKey,
      )
    );

    tokenAccountsProcessed.push(tokenAccountPubkey.toString());
  }

  
  if (tokenAccountsProcessed.length > 0) {
    try {
      
      sourceConnection.setTxNote(
        `Batch transfer of token account authorities to ${newAuthorityPublicKey.toString()}`
      );

      
      console.log(`Sending batch transaction for ${tokenAccountsProcessed.length} token accounts...`);
      const txHash = await sendAndConfirmTransaction(sourceConnection, transaction, []);
      console.log(`✅ Authority transferred successfully for all accounts! TX: https://explorer.solana.com/tx/${txHash}`);
      
      
      console.log("Processed the following token accounts:");
      tokenAccountsProcessed.forEach((account, index) => {
        console.log(`${index+1}. ${account}`);
      });
      
    } catch (error) {
      console.error("❌ Failed to transfer authorities:", error);
      console.log("The following accounts were not processed due to the error:");
      tokenAccountsProcessed.forEach((account, index) => {
        console.log(`${index+1}. ${account}`);
      });
    }
  } else {
    console.log("No token accounts found to process.");
  }

  console.log("Token authority transfer process completed.");
};

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});