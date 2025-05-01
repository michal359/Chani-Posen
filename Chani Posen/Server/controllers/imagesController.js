const model = require('../model/imagesModel');

async function getImagesByClientId(id) {
    try {
        return model.getImagesByClientId(id);
    }
    catch (err) {
        throw err;
    }
};

async function deleteImage(id) {
    try {
        return model.deleteImage(id);
    }
    catch (err) {
        throw err;
    }
};

module.exports = { getImagesByClientId, deleteImage }