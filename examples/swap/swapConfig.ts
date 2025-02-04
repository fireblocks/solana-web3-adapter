export const swapConfig = {
  executeSwap: false,
  useVersionedTransaction: false,
  tokenAAmount: 0.001, // Swap 0.001 SOL for USDC in this example
  tokenAAddress: "So11111111111111111111111111111111111111112", // Token to swap for the other, SOL in this case
  tokenBAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC address
  maxLamports: 1500000, // Micro lamports for priority fee
  direction: "in" as "in" | "out",
  liquidityFile: "swapAccounts.json",
  maxRetries: 20
};