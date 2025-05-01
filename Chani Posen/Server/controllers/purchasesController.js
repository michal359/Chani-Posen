const model = require('../model/purchasesModel');

async function getClientsPurchasesById(id) {
    try {
        return model.getClientsPurchasesById(id);
    }
    catch (err) {
        throw err;
    }
};

async function deletePurchase(id) {
    try {
        return model.deletePurchase(id);
    }
    catch (err) {
        throw err;
    }
};

async function updatePurchaseStatus(body, id) {
    try {
        return model.updatePurchaseStatus(body, id);
    }
    catch (err) {
        throw err;
    }
};

async function addPurchase(body) {
    try {
        return model.addPurchase(body);
    }
    catch (err) {
        throw err;
    }
};



module.exports = { getClientsPurchasesById, deletePurchase, updatePurchaseStatus, addPurchase }