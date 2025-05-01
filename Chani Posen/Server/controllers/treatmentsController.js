const model = require('../model/treatmentsModel');

async function getTreatmentsByClientId(id) {
    try {
        return model.getTreatmentsByClientId(id);
    }
    catch (err) {
        throw err;
    }
};

async function deleteTreatment(id) {
    try {
        console.log('delete treatment controller');
        return model.deleteTreatment(id);
    }
    catch (err) {
        throw err;
    }
};

async function updateTreatment(body, id) {
    try {
        return model.updateTreatment(body, id);
    }
    catch (err) {
        throw err;
    }
};

async function createTreatment(body) {
    try {
        console.log("controller body:", body);  
        console.log(JSON.stringify(body, null, 2)); 
        return model.createTreatment(body);
    }
    catch (err) {
        throw err;
    }
};


module.exports = { getTreatmentsByClientId, deleteTreatment, updateTreatment, createTreatment }