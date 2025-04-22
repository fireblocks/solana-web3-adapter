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
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForSignature = void 0;
const fireblocks_sdk_1 = require("fireblocks-sdk");
require("dotenv").config();
const DEFAULT_POLLING_INTERVAL = 2000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const waitForSignature = (tx_1, fireblocksApiClient_1, ...args_1) => __awaiter(void 0, [tx_1, fireblocksApiClient_1, ...args_1], void 0, function* (tx, fireblocksApiClient, pollingInterval = DEFAULT_POLLING_INTERVAL, logger) {
    const failedStatuses = new Set([
        fireblocks_sdk_1.TransactionStatus.BLOCKED,
        fireblocks_sdk_1.TransactionStatus.CANCELLED,
        fireblocks_sdk_1.TransactionStatus.FAILED,
        fireblocks_sdk_1.TransactionStatus.REJECTED,
    ]);
    let retries = 0;
    let txResponse = yield fireblocksApiClient.getTransactionById(tx.id);
    let lastStatus = txResponse.status;
    logger === null || logger === void 0 ? void 0 : logger.debug(`Transaction ${txResponse.id} status: ${txResponse.status}`);
    while (txResponse.status !== fireblocks_sdk_1.TransactionStatus.COMPLETED &&
        txResponse.status !== fireblocks_sdk_1.TransactionStatus.BROADCASTING) {
        if (failedStatuses.has(txResponse.status)) {
            throw new Error(`Transaction ${txResponse.id} failed with status ${txResponse.status} (${txResponse.subStatus})`);
        }
        yield new Promise((resolve) => setTimeout(resolve, pollingInterval));
        try {
            txResponse = yield fireblocksApiClient.getTransactionById(tx.id);
        }
        catch (error) {
            if (retries >= MAX_RETRIES)
                throw error;
            retries++;
            yield new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            continue;
        }
        if (txResponse.status !== lastStatus) {
            logger === null || logger === void 0 ? void 0 : logger.debug(`Transaction ${txResponse.id} status: ${txResponse.status}`);
            lastStatus = txResponse.status;
        }
    }
    return txResponse;
});
exports.waitForSignature = waitForSignature;
