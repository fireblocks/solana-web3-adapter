"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireblocksConnectionAdapter = void 0;
const fs_1 = __importDefault(require("fs"));
const web3_js_1 = require("@solana/web3.js");
const fireblocks_sdk_1 = require("fireblocks-sdk");
const helpers_1 = require("./helpers");
const types_1 = require("./types");
/**
 * Fireblocks Solana Web3 Connection Adapter Class
 *
 * Should be instantiated via the static 'create' method
 */
class FireblocksConnectionAdapter extends web3_js_1.Connection {
    constructor(fireblocksClient, endpoint, config, commitment) {
        var _a, _b;
        super(endpoint, { commitment });
        this.account = '';
        this.txNote = '';
        this.externalTxId = null;
        this.getTxNote = () => {
            return this.txNote;
        };
        this.getConfig = () => {
            return this.adapterConfig;
        };
        /**
         * Set External Transaction Identifier
         * @param externalTxId - external transaction identifier: string
         */
        this.setExternalTxId = (externalTxId) => {
            this.externalTxId = externalTxId;
        };
        /**
         * Get External Transaction Identifier
         * @returns externalITxId - string
         */
        this.getExternalTxId = () => {
            return this.externalTxId;
        };
        /**
         * Get current account's address (the address of the SOL/SOL_TEST wallet in the configured vault account)
         * @returns
         */
        this.getAccount = () => {
            return this.account;
        };
        this.fireblocksApiClient = fireblocksClient;
        this.adapterConfig = config;
        this.devnet = (_a = config.devnet) !== null && _a !== void 0 ? _a : false;
        this.assetId = this.devnet ? types_1.ASSET_IDS.SOLANA_DEVNET : types_1.ASSET_IDS.SOLANA_MAINNET;
        this.feeLevel = config.feeLevel || fireblocks_sdk_1.FeeLevel.MEDIUM;
        // Create logger with verbose output by default unless silent is true
        const isSilent = (_b = config.silent) !== null && _b !== void 0 ? _b : false;
        this.logger = {
            debug: (...args) => !isSilent && console.log('[DEBUG]', ...args),
            info: (...args) => !isSilent && console.log('[INFO]', ...args),
            warn: (...args) => !isSilent && console.warn('[WARN]', ...args),
            error: (...args) => console.error('[ERROR]', ...args),
        };
    }
    validateConfig(config) {
        if (!config.apiKey || !config.apiSecretPath || !config.vaultAccountId) {
            throw new Error('Missing required configuration parameters');
        }
        if (!fs_1.default.existsSync(config.apiSecretPath)) {
            throw new Error(`API secret file not found at path: ${config.apiSecretPath}`);
        }
    }
    /**
     * Fireblocks Solana Web3 Connection Adapter factory method
     *
     * @param endpoint - required: solana cluster ('testnet' || 'devnet' || 'mainnet-beta')
     * @param config - required: FireblocksConnectionAdapterConfig
     * @param commitment - optional: The level of commitment desired when querying state ('processed' || 'confirmed' || 'finalized')
     * @returns - FireblocksConnectionAdapter instance
     */
    static create(endpoint, config, commitment) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!endpoint) {
                throw new Error('Endpoint is required');
            }
            try {
                const fireblocksSecretKey = yield fs_1.default.promises.readFile(config.apiSecretPath, "utf-8");
                const fireblocksClient = new fireblocks_sdk_1.FireblocksSDK(fireblocksSecretKey, config.apiKey, types_1.API_BASE_URLS.PRODUCTION);
                const environment = endpoint.split(".")[1];
                config.devnet = environment === "devnet" || environment === "testnet";
                const adapter = new FireblocksConnectionAdapter(fireblocksClient, endpoint, config, commitment);
                yield adapter.setAccount(config.vaultAccountId, config.devnet);
                adapter.setExternalTxId(null);
                return adapter;
            }
            catch (error) {
                throw new Error(`Failed to initialize Fireblocks client: ${error.message}`);
            }
        });
    }
    /**
     * Set transaction note
     * @param txNote - transaction note: string
     */
    setTxNote(txNote) {
        this.txNote = txNote;
    }
    setAccount(vaultAccount, devnet) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const solWallet = yield this.fireblocksApiClient.getDepositAddresses(String(vaultAccount), devnet ? types_1.ASSET_IDS.SOLANA_DEVNET : types_1.ASSET_IDS.SOLANA_MAINNET);
                if (!((_a = solWallet === null || solWallet === void 0 ? void 0 : solWallet[0]) === null || _a === void 0 ? void 0 : _a.address)) {
                    throw new Error('No wallet address found');
                }
                this.account = solWallet[0].address;
                this.logger.debug('Account set successfully', { address: this.account });
            }
            catch (error) {
                throw new Error(`Failed to set account: ${error.message}`);
            }
        });
    }
    signWithFireblocks(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('Preparing to sign transaction with Fireblocks', {
                feePayer: this.account,
                feeLevel: this.feeLevel
            });
            try {
                if (!transaction) {
                    throw new Error('Transaction is required');
                }
                const serializedTx = transaction.serialize({ requireAllSignatures: false });
                const payload = {
                    assetId: this.assetId,
                    operation: "PROGRAM_CALL",
                    feeLevel: this.feeLevel,
                    source: {
                        type: fireblocks_sdk_1.PeerType.VAULT_ACCOUNT,
                        id: String(this.adapterConfig.vaultAccountId),
                    },
                    note: this.txNote || "Created by Solana Web3 Adapter",
                    extraParameters: {
                        programCallData: Buffer.from(serializedTx).toString("base64")
                    }
                };
                if (this.externalTxId) {
                    payload.externalTxId = this.externalTxId;
                }
                this.logger.debug('Submitting transaction to Fireblocks', { payload });
                const tx = yield this.createFireblocksTransaction(payload);
                this.logger.info('Transaction submitted to Fireblocks', {
                    transactionId: tx.id,
                    status: tx.status
                });
                return tx;
            }
            catch (error) {
                throw new Error(`Failed to sign transaction with Fireblocks: ${error.message}`);
            }
        });
    }
    confirmTransaction(signatureOrConfig, commitment) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                context: { slot: 0 },
                value: { err: null }
            };
        });
    }
    sendTransaction(transaction, signers, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (transaction instanceof web3_js_1.Transaction) {
                    if (!transaction.recentBlockhash) {
                        const { blockhash } = yield this.getLatestBlockhash();
                        transaction.recentBlockhash = blockhash;
                        transaction.feePayer = new web3_js_1.PublicKey(this.account);
                    }
                }
                else {
                    if (!transaction.message.recentBlockhash) {
                        const { blockhash } = yield this.getLatestBlockhash();
                        transaction.message.recentBlockhash = blockhash;
                        // For versioned transactions, fee payer is the first account in the message
                        if (!transaction.message.staticAccountKeys[0].equals(new web3_js_1.PublicKey(this.account))) {
                            transaction.message.staticAccountKeys[0] = new web3_js_1.PublicKey(this.account);
                        }
                    }
                }
                if (signers && Array.isArray(signers)) {
                    for (const signer of signers) {
                        if (transaction instanceof web3_js_1.Transaction) {
                            transaction.partialSign(signer);
                        }
                        else {
                            transaction.sign([signer]);
                        }
                    }
                }
                const fbTxResponse = yield this.signWithFireblocks(transaction);
                this.logger.debug('Waiting for transaction confirmation');
                const finalTxResponse = yield (0, helpers_1.waitForSignature)(fbTxResponse, this.fireblocksApiClient, this.adapterConfig.pollingInterval || 3000, this.logger);
                if (!finalTxResponse.txHash) {
                    throw new Error('Transaction hash not found in Fireblocks response');
                }
                this.logger.info('Transaction confirmed', {
                    txHash: finalTxResponse.txHash,
                    status: finalTxResponse.status
                });
                return finalTxResponse.txHash;
            }
            catch (error) {
                this.logger.error('Transaction failed', error);
                throw new Error(`Failed to send transaction: ${error.message}`);
            }
        });
    }
    /**
     * Set transaction fee level
     * @param feeLevel - transaction fee level: "HIGH" | "MEDIUM" | "LOW"
     */
    setFeeLevel(feeLevel) {
        this.feeLevel = feeLevel;
    }
    /**
     * Get current fee level
     * @returns FeeLevel
     */
    getFeeLevel() {
        return this.feeLevel;
    }
    // Add protected methods to allow mocking in tests
    createFireblocksTransaction(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fireblocksApiClient.createTransaction(payload);
        });
    }
    getBlockhash() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.getLatestBlockhash()).blockhash;
        });
    }
}
exports.FireblocksConnectionAdapter = FireblocksConnectionAdapter;
