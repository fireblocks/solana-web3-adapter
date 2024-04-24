import { clusterApiUrl } from "@solana/web3.js";
import { FireblocksConnectionAdapter } from "../src/FireblocksConnectionAdapter";
import { createNonceAccountAndAuthority } from "../src/helpers";
import { FireblocksConnectionAdapterConfig } from "../src/types";

require("dotenv").config();

const main = async () => {
  const fireblocksConnectionConfig: FireblocksConnectionAdapterConfig = {
    apiKey: process.env.FIREBLOCKS_API_KEY,
    apiSecretPath: process.env.FIREBLOCKS_SECRET_KEY_PATH,
    vaultAccountId: 0,
  };

  const connection = await FireblocksConnectionAdapter.create(
    clusterApiUrl("devnet"),
    fireblocksConnectionConfig,
  );

  const res = await createNonceAccountAndAuthority(connection);
  console.log(res);
};
main();
