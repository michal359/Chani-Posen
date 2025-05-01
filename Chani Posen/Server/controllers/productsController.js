const model = require('../model/productsModel');

async function getProducts() {
    try {
        return model.getProducts();
    }
    catch (err) {
        throw err;
    }
};

async function getProductById(id) {
    try {
        return model.getProductById(id);
    }
    catch (err) {
        throw err;
    }
};

async function addProduct(body) {
    try {
        return model.addProduct(body);
    }
    catch (err) {
        throw err;
    }
};


async function deleteProduct(id) {
    try {
        return model.deleteProduct(id);
    }
    catch (err) {
        throw err;
    }
};


async function updateProduct(body, id) {
    try {
        return model.updateProduct(body, id);
    }
    catch (err) {
        throw err;
    }
};

async function getProductsCount() {
    try {
        return model.getProductsCount();;
    }
    catch (err) {
        throw err;
    }
}


module.exports = { getProducts, getProductById, addProduct, deleteProduct, updateProduct, getProductsCount }