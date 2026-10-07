const model = require('../model/treatmentTypesModel');

async function getTreatmentTypes() {
    try {
        return await model.getTreatmentTypes();
    } catch (error) {
        console.error(
            "Error in getTreatmentTypes controller:",
            error
        );

        throw error;
    }
}

module.exports = {
    getTreatmentTypes
};