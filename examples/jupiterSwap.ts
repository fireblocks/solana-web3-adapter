import { clusterApiUrl, VersionedTransaction } from '@solana/web3.js';
import axios from 'axios';
import { FireblocksConnectionAdapter, FireblocksConnectionAdapterConfig } from '../src';
require('dotenv').config();


// Swap SOL to USDC configuration
const JUPITER_CONFIG = {
  API_URL: 'https://quote-api.jup.ag/v6',
  WRAPPED_SOL_MINT: 'So11111111111111111111111111111111111111112',
  USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  AMOUNT_TO_SWAP: 0.1 * 10 ** 9,
  SLIPPAGE_BPS: 50,
};

// Fireblocks Adapter Configuration
const connectionConfig: FireblocksConnectionAdapterConfig = {
  apiKey: process.env.FIREBLOCKS_API_KEY,
  apiSecretPath: process.env.FIREBLOCKS_SECRET_KEY_PATH,
  vaultAccountId: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID,
  silent: false,
};

// Jupiter API Helper Functions
async function getJupiterQuote(inputMint: string, outputMint: string, amount: number, slippageBps: number) {
  const response = await axios.get(
    `${JUPITER_CONFIG.API_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
  );
  return response.data;
}

async function createSwapTransaction(quoteResponse: any, userPublicKey: string) {
  const response = await axios.post(`${JUPITER_CONFIG.API_URL}/swap`, {
    quoteResponse,
    userPublicKey,
    wrapAndUnwrapSol: true,
  });

  if (!response.data.swapTransaction) {
    console.error('No swapTransaction in response:', response);
    throw new Error('Failed to get swap transaction');
  }

  return response.data.swapTransaction;
}


async function main() {
  
  // Initialize Fireblocks Connection Adapter
  const connection = await FireblocksConnectionAdapter.create(
    clusterApiUrl('mainnet-beta'),
    connectionConfig
  );

  // Get quote
  const quoteResponse = await getJupiterQuote(
    JUPITER_CONFIG.WRAPPED_SOL_MINT,
    JUPITER_CONFIG.USDC_MINT,
    JUPITER_CONFIG.AMOUNT_TO_SWAP,
    JUPITER_CONFIG.SLIPPAGE_BPS
  );
  console.log('Quote Response:', quoteResponse);

  // Get swap transaction
  const swapTransactionBase64 = await createSwapTransaction(
    quoteResponse,
    connection.getAccount()
  );
  console.log('Swap API Transaction To Sign:', swapTransactionBase64);

  // Desirialize and send transaction via Fireblocks Connection Adapter
  const swapTransactionBuf = Buffer.from(swapTransactionBase64, 'base64');
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
  console.log('Transaction Object:', JSON.stringify(transaction, null, 2));

  const tx = await connection.sendTransaction(transaction);
  console.log('Transaction sent:', tx);
}

main().catch((error) => {
  console.error('Error executing swap:', error);
  process.exit(1);
});
