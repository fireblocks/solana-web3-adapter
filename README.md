
<p align="center">
  <img src="./logo.svg" width="350" alt="accessibility text">
</p>
<div align="center">

  [Fireblocks Developer Portal](https://developers.fireblocks.com) </br>
  [Fireblocks Sandbox Sign-up](https://www.fireblocks.com/developer-sandbox-sign-up/) <br/><br/>
  <h1> Fireblocks Solana Web3 Connection Adapter </h1>
</div>
<br/>


> :warning: **Warning:** 
> This code example utilizes the Fireblocks RAW signing feature. 
> 
> Raw Signing is an insecure signing method and is not generally recommended.  
> Bad actors can trick someone into signing a valid transaction message and use it to steal funds.
> 
> For this reason, Raw Signing is a premium feature that requires an additional purchase and is not available in production workspaces by default. 
> If you're interested in this feature and want to see if your use case is eligible for it, please contact your Customer Success Manager.
> 
> [Fireblocks Sandbox](https://developers.fireblocks.com/docs/sandbox-quickstart)  workspaces have Raw Signing enabled by default to allow for testing purposes.
<br/>

> :warning: **Warning:** 
> This code example is in Alpha version and should not be used in your production environment. 

<br/>
<hr/>


## Introduction

The Fireblocks Solana Web3 Connection Adapter facilitates interactions between the Fireblocks API and the Solana blockchain, simplifying the process of sending transactions through Fireblocks by handling complex authentication, nonce management, and transaction signing procedures.

The Solana Web3 Connection Adapter utilizes Fireblocks [Raw Singing]() for processing any non native, single instruction transactions.

If the transaction has a single `transfer` instruction - the adapter will identify that and will execute the request a regular Fireblocks Solana transaction.


## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/fireblocks/solana-web3-provider.git
cd solana-web3-provider
npm install -g typescript ts-node
npm install
```

## Configuration

Configure the adapter with your Fireblocks API credentials and Solana connection details (See .env.example for reference):

```js
import { FireblocksConnectionAdapter } from './path_to_adapter';

const config = {
  apiKey: process.env.FIREBLOCKS_API_KEY,
  apiSecretPath: process.env.FIREBLOCKS_SECRET_KEY_PATH,
  vaultAccountId: 'your_vault_account_id'
};

const solanaEndpoint = 'https://api.devnet.solana.com'; // Use appropriate Solana RPC endpoint

```

## Usage

Creating an Adapter Instance:

```js
const connection = await FireblocksConnectionAdapter.create(solanaEndpoint, config);
```

Sending a Transaction:

```js
const { Transaction, SystemProgram, sendAndConfirmTransaction} = require('@solana/web3.js');

const fromMyAccount = new PublicKey(connection.getAccount());

let transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: fromMyAccount,
    toPubkey: new PublicKey('destination_public_key'),
    lamports: 1000
  })
);

const txHash = await connection.sendTransaction(transaction);
// OR
const txHash = await sendAndConfirmTransaction(connection, transaction, []);

console.log('Transaction sent with hash:', txHash);
```

## Examples

See the [examples]() directory in this repository for more detailed examples.