const model = require('../model/loginModel');
const crypto = require('crypto');

async function postLogin(body) {
    try {
        const { password, username } = body;

        // Ensure you hash the password only once
        const saltedPassword = password + body.salt;
        console.log("Salted password:", saltedPassword);

        const hashedPassword = crypto.createHash('sha256')
            .update(saltedPassword)
            .digest('hex');
        console.log("Hashed password:", hashedPassword);

        // Pass the hashed password to the model
        return model.postLogin({ ...body, password: hashedPassword });
    } catch (err) {
        console.error("Error hashing password:", err);
        throw err;
    }
}

async function getSalt(username) {
    try {
        return model.getSalt(username);
    } catch (err) {
        throw err;
    }
}

module.exports = { postLogin, getSalt };

