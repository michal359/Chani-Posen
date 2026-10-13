
const walletModel = require("../model/walletModel");

// ---------------------------------------------
// 1. Get client wallet details
// ---------------------------------------------
// Returns the current wallet balance
// and recent wallet-related transactions.

async function getWalletByClientId(clientId) {
    return await walletModel.getWalletByClientId(clientId);
}

// ---------------------------------------------
// 2. Manually add or remove wallet credit
// ---------------------------------------------
// CREDIT = add money to wallet
// DEBIT  = reduce wallet balance
//
// The model validates the amount,
// records the adjustment in payments,
// and updates the wallet inside a transaction.

async function adjustWallet(clientId, body) {
    return await walletModel.adjustWallet(clientId, body);
}

module.exports = {
    getWalletByClientId,
    adjustWallet
};
