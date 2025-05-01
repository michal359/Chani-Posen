const model = require('../model/recommendationsModel');

async function addRecommendation(body) {
    try {
        return model.addRecommendation(body);
    }
    catch (err) {
        throw err;
    }
};

async function getRecommendations(id) {
    try {
        return model.getRecommendations(id);
    }
    catch (err) {
        throw err;
    }
};

async function deleteRecommendation(id) {
    try {
        return model.deleteRecommendation(id);
    }
    catch (err) {
        throw err;
    }
};


module.exports = { addRecommendation, getRecommendations, deleteRecommendation }