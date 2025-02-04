<p align="center">
  <img src="./logo.svg" width="350" alt="accessibility text">
</p>
<div align="center">

  [Fireblocks Developer Portal](https://developers.fireblocks.com) </br>
  [Fireblocks Sandbox Sign-up](https://www.fireblocks.com/developer-sandbox-sign-up/) <br/><br/>
  <h1> Fireblocks Solana Web3 Connection Adapter </h1>
</div>
<br/>
<hr/>


## Introduction

The Fireblocks Solana Web3 Connection Adapter facilitates interactions between the Fireblocks API and the Solana blockchain, simplifying the process of sending transactions through Fireblocks by handling complex authentication and transaction signing procedures.

The Solana Web3 Connection Adapter utilizes Fireblocks Program Call API to process and sign all transactions, providing a seamless integration with the Solana blockchain.

> **Note**: This Web3 Connection Adapter is currently in Beta. We welcome your feedback and pull requests to help improve the package!

> **Important**: The Program Call API is currently in Early Availability. Please contact your Customer Success Manager (CSM) to enable this feature for your workspace.


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
  vaultAccountId: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID
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
    toPubkey: new PublicKey('destination_address'),
    lamports: 1000
  })
);

const txHash = await connection.sendTransaction(transaction);
// OR
const txHash = await sendAndConfirmTransaction(connection, transaction, []);

console.log('Transaction sent with hash:', txHash);
```

## Examples

See the [examples](https://github.com/fireblocks/solana-web3-provider/tree/main/examples) directory in this repository for more detailed examples.


## Connection Configuration
```js
 apiKey: string - Your Fireblocks API Key
 apiSecretPath: string - Path to your Fireblocks API Secret Key
 apiBaseUrl?: ApiBaseUrl | string - Base URL for the Fireblocks API (optional, defaults to US production environment)
 vaultAccountId: string | number - The ID of the vault account to use for transactions
 devnet?: boolean - Whether to use the Devnet environment (optional, defaults to false)
 pollingInterval?: number - Fireblocks API polling interval for tx status updates
 feeLevel?: FeeLevel - Fee level to use for transactions (optional, defaults to MEDIUM)
 silent?: boolean - Whether to suppress logging (optional, defaults to false)
```


## Extended methods

Fireblocks Solana Web3 Connection Adapter introduces a few extended methods for better user experience:

Set a transaction note:
```js
connection.setTxNote(txNote: string)
```


Set an external transaction identifier:
```js
connection.setExternalTxId(externalTxId: string | null)
```

Get the address of the current account (the address of the SOL/SOL_TEST wallet in the configured vault account):
```js
connection.getAccount() 
```