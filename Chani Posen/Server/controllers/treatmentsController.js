const model = require('../model/treatmentsModel');

async function getTreatmentsByClientId(id) {
    try {
        return await model.getTreatmentsByClientId(id);
    } catch (err) {
        console.error(
            "Error in getTreatmentsByClientId controller:",
            err
        );
        throw err;
    }
}

async function deleteTreatment(id) {
    try {
        console.log(
            "Deleting treatment in controller. ID:",
            id
        );

        return await model.deleteTreatment(id);

    } catch (err) {
        console.error(
            "Error in deleteTreatment controller:",
            err
        );
        throw err;
    }
}

async function updateTreatment(body, id) {
    try {
        console.log(
            "Updating treatment in controller. ID:",
            id
        );

        return await model.updateTreatment(body, id);

    } catch (err) {
        console.error(
            "Error in updateTreatment controller:",
            err
        );
        throw err;
    }
}

async function createTreatment(body) {
    try {
        console.log(
            "Creating treatment in controller:",
            body
        );

        return await model.createTreatment(body);

    } catch (err) {
        console.error(
            "Error in createTreatment controller:",
            err
        );
        throw err;
    }
}

module.exports = {
    getTreatmentsByClientId,
    deleteTreatment,
    updateTreatment,
    createTreatment
};