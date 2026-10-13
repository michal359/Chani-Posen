
const model = require("../model/treatmentsModel");

// ----------------------------------------
// Get all treatments for a client
// ----------------------------------------
async function getTreatmentsByClientId(id) {
    return await model.getTreatmentsByClientId(id);
}

// ----------------------------------------
// Delete an unpaid treatment
// ----------------------------------------
async function deleteTreatment(id) {
    return await model.deleteTreatment(id);
}

// ----------------------------------------
// Edit treatment details
// ----------------------------------------
// Updates treatment type, date, duration,
// summary and price.
//
// Payment history is managed separately.
async function updateTreatment(body, id) {
    return await model.updateTreatment(body, id);
}

// ----------------------------------------
// Create a new treatment
// ----------------------------------------
async function createTreatment(body) {
    return await model.createTreatment(body);
}

// ----------------------------------------
// Add payment to an existing treatment
// ----------------------------------------
// Supports direct payments, partial payments
// and payments from the client's wallet.
async function addTreatmentPayment(body, id) {
    return await model.addTreatmentPayment(body, id);
}

module.exports = {
    getTreatmentsByClientId,
    deleteTreatment,
    updateTreatment,
    createTreatment,
    addTreatmentPayment
};
