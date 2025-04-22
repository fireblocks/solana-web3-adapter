"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_IDS = exports.API_BASE_URLS = exports.FeeLevel = void 0;
var fireblocks_sdk_1 = require("fireblocks-sdk");
Object.defineProperty(exports, "FeeLevel", { enumerable: true, get: function () { return fireblocks_sdk_1.FeeLevel; } });
exports.API_BASE_URLS = {
    PRODUCTION: "https://api.fireblocks.io",
    SANDBOX: "https://sandbox-api.fireblocks.io",
};
exports.ASSET_IDS = {
    SOLANA_DEVNET: "SOL_TEST",
    SOLANA_MAINNET: "SOL",
};
