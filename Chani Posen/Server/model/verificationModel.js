const pool = require('../DB.js');

async function verifyToken(token) {
    try {
        const sql = `
            SELECT user_id, expires_at 
            FROM password_reset_tokens 
            WHERE token_id = ?
        `;
        const [result] = await pool.query(sql, [token]);

        if (result.length === 0) {
            return { success: false, message: "הטוקן לא נמצא במערכת" };
        }

        const { user_id, expires_at } = result[0];
        const now = new Date();

        if (new Date(expires_at) < now) {
            return {
                success: false,
                user_id,
                message: "תוקף הטוקן פג"
            };
        }

        return {
            success: true,
            user_id,
            message: "הטוקן תקף"
        };
    } catch (err) {
        console.error("Error:", err);
        throw new Error(err.message);
    }
}

async function setPassword(user_id, hashedPassword, salt) {
    const sql = `
        INSERT INTO passwords (user_id, user_password, salt)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            user_password = VALUES(user_password),
            salt = VALUES(salt)
    `;
    await pool.query(sql, [user_id, hashedPassword, salt]);
}

async function verifyUser(user_id) {
    const sql = `
        UPDATE users 
        SET is_verified = 1 
        WHERE user_id  = ?
    `;
    await pool.query(sql, [user_id]);
}

async function getUserInfo(user_id) {
    const sql = `
        SELECT email, username, first_name 
        FROM users 
        WHERE user_id  = ?
    `;
    const [result] = await pool.query(sql, [user_id]);
    return result[0];
}

async function deleteToken(token_id) {
    const sql = `
        DELETE FROM password_reset_tokens
        WHERE token_id = ?
    `;
    await pool.query(sql, [token_id]);
}

async function deleteTokensByUserId(user_id) {
    const sql = `DELETE FROM password_reset_tokens WHERE user_id = ?`;
    await pool.query(sql, [user_id]);
}

async function saveToken(user_id, token_id, expires_at) {
    const sql = `
      INSERT INTO password_reset_tokens (user_id, token_id, expires_at)
      VALUES (?, ?, ?)
    `;
    await pool.query(sql, [user_id, token_id, expires_at]);
}

module.exports = { verifyToken, setPassword, verifyUser, getUserInfo, deleteToken, saveToken, deleteTokensByUserId };
