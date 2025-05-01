const model = require('../model/clientsModel');
const crypto = require('crypto');
require('dotenv').config();
const { transliterate } = require('transliteration');

function generateUsername(firstName, lastName, userId) {
    if (!firstName || !lastName || !userId) {
        throw new Error("Missing required parameters");
    }
    const englishFirstName = transliterate(firstName).replace(/[^a-zA-Z]/g, "");
    const englishLastName = transliterate(lastName).replace(/[^a-zA-Z]/g, "");
    return `${englishFirstName}${englishLastName}${userId}`;
}


const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

async function getAllClients(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const data = await model.getAllClients(page, limit);
        res.send(data);
    } catch (err) {
        console.error("Error in getAllClients:", err);
        res.status(500).send({ success: false, message: err.message });
    }
}


async function getClient(id) {
    try {
        return model.getClient(id);
    } catch (err) {
        throw err;
    }
};

async function getUniqueUsername(query) {
    try {
        console.log('check cont, data: ', query)
        return model.getUniqueUsername(query);
    } catch (err) {
        throw err;
    }
}

async function updateClient(body, id) {
    try {
        return await model.updateClient(body, id);
    } catch (err) {
        throw err;
    }
}

async function createNewClient(body) {
    try {
        const password = generatePassword();
        const salt = crypto.randomBytes(16).toString('hex');
        const saltedPassword = password + salt;
        const hashedPassword = crypto.createHash('sha256').update(saltedPassword).digest('hex');

        const result = await model.createNewClient(body, hashedPassword, salt);
        if (result.ok) {
            const username = generateUsername(body.first_name, body.last_name, result.userId);
            await model.updateUsername(result.userId, username);
            return { ...result, username };
        } 
    } catch (err) {
        throw err;
    }

}

async function getClientsByProductId(productId) {
    try {
        return model.getClientsByProductId(productId);
    } catch (err) {
        throw err;
    }
};

async function deleteClient(id) {
    try {
        return model.deleteClient(id);
    } catch (err) {
        throw err;
    }
};

async function getClientsCount() {
    try {
        return model.getClientsCount();;
    }
    catch (err) {
        throw err;
    }
}


module.exports = { getAllClients, getClientsCount, getClient, updateClient, getUniqueUsername, createNewClient, getClientsByProductId, deleteClient };
