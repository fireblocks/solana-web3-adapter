import RaydiumSwap from './Raydium';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import 'dotenv/config';
import { swapConfig } from './swapConfig';

const swap = async () => {
  
  const raydiumSwap = await RaydiumSwap.create();
  console.log(`Raydium swap initialized`);
  console.log(`Swapping ${swapConfig.tokenAAmount} of ${swapConfig.tokenAAddress} for ${swapConfig.tokenBAddress}...`)

  /**
   * Load pool keys from the swap config file to enable finding pool information.
   */
  await raydiumSwap.loadPoolKeys(swapConfig.liquidityFile);
  console.log(`Loaded pool keys`);

  /**
   * Find pool information for the given token pair.
   */

  const poolInfo = raydiumSwap.findPoolInfoForTokens(swapConfig.tokenAAddress, swapConfig.tokenBAddress);
  if (!poolInfo) {
    console.error('Pool info not found');
    return 'Pool info not found';
  } else {
    console.log('Found pool info');
  }

  /**
   * Prepare the swap transaction with the given parameters.
   */
  const tx = await raydiumSwap.getSwapTransaction(
    swapConfig.tokenBAddress,
    swapConfig.tokenAAmount,
    poolInfo,
    swapConfig.maxLamports, 
    swapConfig.useVersionedTransaction,
    swapConfig.direction
  );

 
    /**
     * Send the transaction to the network and log the transaction ID.
     */
    const txid = swapConfig.useVersionedTransaction
      ? await raydiumSwap.sendVersionedTransaction(tx as VersionedTransaction, swapConfig.maxRetries)
      : await raydiumSwap.sendLegacyTransaction(tx as Transaction, swapConfig.maxRetries);

    console.log(`Submitted transaction with Fireblocks ID: ${txid}`);
};

swap();