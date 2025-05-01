const pool = require('../DB.js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

async function postLogin(body) {
    try {
        const { username, password } = body;

        const loginSql = `SELECT p.salt, p.user_password, u.user_id, u.role_id 
                          FROM passwords p 
                          JOIN users u ON p.user_id = u.user_id 
                          WHERE u.username = ?`;

        const loginResult = await pool.query(loginSql, [username]);

        if (loginResult[0].length === 0) {
            throw new Error("Username not found");
        }

        const { salt, user_password, user_id, role_id } = loginResult[0][0];

        if (password !== user_password) {
            throw new Error("Incorrect password");
        }

        const userDetailsSql = `SELECT u.user_id, u.role_id, u.username, u.first_name, u.last_name, 
                                       u.email, u.phone, u.birth_date, u.created_at,
                                       COALESCE(c.treatment_status, '') AS treatment_status,
                                       COALESCE(c.skin_type, '') AS skin_type, 
                                       COALESCE(a.professional_description, '') AS professional_description
                                FROM users u
                                LEFT JOIN clients c ON u.user_id = c.client_id
                                LEFT JOIN admins a ON u.user_id = a.admin_id
                                WHERE u.user_id = ?`;

        const userDetailsResult = await pool.query(userDetailsSql, [user_id]);

        if (userDetailsResult[0].length === 0) {
            throw new Error("User details not found");
        }

        const user = userDetailsResult[0][0];

        return { success: true, message: "Login successful", user };
    } catch (err) {
        console.error("Error in postLogin model:", err.message); 
        throw err;
    }
}



async function getSalt(username) {
    try {
        const sql = `SELECT p.salt 
                     FROM passwords p 
                     JOIN users u ON p.user_id = u.user_id 
                     WHERE u.username = ?`;
        const result = await pool.query(sql, [username]);

        if (result[0].length === 0) {
            throw new Error("Username not found");
        }

        return { success: true, salt: result[0][0].salt };
    } catch (err) {
        throw new Error(err.message);
    }
}

module.exports = { postLogin, getSalt }  
