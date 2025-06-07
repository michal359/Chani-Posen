const pool = require('../DB.js');

async function getAllClients(page = 1, limit = 10) {
    try {
        const offset = (page - 1) * limit;
        const sql = `SELECT DISTINCT 
    u.user_id, 
    u.username, 
    u.first_name, 
    u.last_name, 
    u.email, 
    u.phone, 
    u.birth_date, 
    u.created_at, 
    u.role_id, 
    c.treatment_status, 
    c.skin_type, 
    i.image_path AS profile_image
FROM users u
JOIN clients c ON u.user_id = c.client_id
LEFT JOIN images i ON u.user_id = i.user_id AND i.image_type = 'profile'
WHERE u.role_id = 2
LIMIT ? OFFSET ?;
`;
const [result] = await pool.query(sql, [parseInt(limit), parseInt(offset)]);
        const countSql = `SELECT COUNT(*) AS total FROM users u JOIN clients c ON u.user_id = c.client_id WHERE u.role_id = 2;`;
        const [countResult] = await pool.query(countSql);
        const totalClients = countResult[0].total;

        return {
            success: true,
            message: "Clients fetched successfully",
            clients: result,
            totalPages: Math.ceil(totalClients / limit),
            currentPage: page,
            totalClients
        };
    } catch (err) {
        console.error("Error:", err);
        throw new Error(err.message);
    }
}

async function searchClientsByName(searchTerm) {
    try {
        const likeTerm = `%${searchTerm}%`;

        const sql = `
            SELECT DISTINCT 
                u.user_id, 
                u.username, 
                u.first_name, 
                u.last_name, 
                u.email, 
                u.phone, 
                u.birth_date, 
                u.created_at, 
                u.role_id, 
                c.treatment_status, 
                c.skin_type, 
                i.image_path AS profile_image
            FROM users u
            JOIN clients c ON u.user_id = c.client_id
            LEFT JOIN images i ON u.user_id = i.user_id AND i.image_type = 'profile'
            WHERE u.role_id = 2 
              AND (
                    u.first_name LIKE ? 
                    OR u.last_name LIKE ?
                    OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?
                )
            ORDER BY u.last_name;
        `;

        const [result] = await pool.query(sql, [likeTerm, likeTerm, likeTerm]);

        return {
            success: true,
            message: "Clients fetched by search successfully",
            clients: result,
            totalClients: result.length,
        };
    } catch (err) {
        console.error("Error in searchClientsByName:", err);
        throw new Error(err.message);
    }
}

async function filterClients({ status, skin }) {
    try {
        const filters = [];
        const values = [];

        if (status) {
            filters.push("c.treatment_status = ?");
            values.push(status);
        }

        if (skin) {
            filters.push("c.skin_type = ?");
            values.push(skin);
        }

        const whereClause = `WHERE u.role_id = 2${filters.length ? ' AND ' + filters.join(' AND ') : ''}`;

        const sql = `
            SELECT DISTINCT 
                u.user_id, 
                u.username, 
                u.first_name, 
                u.last_name, 
                u.email, 
                u.phone, 
                u.birth_date, 
                u.created_at, 
                u.role_id, 
                c.treatment_status, 
                c.skin_type, 
                i.image_path AS profile_image
            FROM users u
            JOIN clients c ON u.user_id = c.client_id
            LEFT JOIN images i ON u.user_id = i.user_id AND i.image_type = 'profile'
            ${whereClause}
            ORDER BY u.last_name;
        `;

        const [result] = await pool.query(sql, values);

        return {
            success: true,
            message: "Clients filtered successfully",
            clients: result,
            totalClients: result.length,
        };
    } catch (err) {
        console.error("Error in filterClients:", err);
        throw new Error(err.message);
    }
}


async function getClient(id) {
    try {
        const sql = `SELECT DISTINCT 
    u.user_id, 
    u.username, 
    u.first_name, 
    u.last_name, 
    u.email, 
    u.phone, 
    u.birth_date, 
    u.created_at, 
    u.role_id,
    u.is_verified, 
    c.treatment_status, 
    c.skin_type,
    i.image_path AS profile_image
FROM users u
JOIN clients c ON u.user_id = c.client_id
LEFT JOIN images i ON u.user_id = i.user_id AND i.image_type = 'profile'
WHERE u.user_id = ?;
`;
        const [result] = await pool.query(sql, [id]);

        if (result.length > 0) {
            console.log("Found client data:", result);
            return { success: true, message: "clients fetched successfully", clients: result };
        } else {
            console.log("No clients found for id:", id);
            throw new Error("clients not found");
        }
    } catch (err) {
        console.error("Error:", err);
        throw new Error(err.message);
    }
}

async function getUniqueUsername(query) {
    try {
        console.log('check model, data: ', query)
        const sql = 'SELECT * from users WHERE ?';
        const [result] = await pool.query(sql, [query]);
        console.log('uniqe user name? ', result[0].count === 0)
        return result[0].count === 0;
    } catch (err) {
        console.error("Error: ", err);
        throw new Error(err.massage);
    }

}

async function updateClient(body, id) {
    try {
        const user_id = id;
        const { first_name, last_name, email, phone, birth_date, skin_type, treatment_status } = body;

        const formatDate = (date) => {
            if (!date) return null;
            const localDate = new Date(date);
            localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
            return localDate.toISOString().split('T')[0];
        };

        const userSql = `UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, birth_date = ? WHERE user_id = ?`;
        await pool.query(userSql, [first_name, last_name, email, phone, formatDate(birth_date), user_id]);


        const clientSql = `UPDATE clients SET skin_type = ?, treatment_status = ? WHERE client_id = ?`;
        await pool.query(clientSql, [skin_type, treatment_status, user_id]);

        return { success: true, message: `Client ${user_id} updated successfully`, client: body };

    } catch (error) {
        console.error("Error updating client:", error);
        throw error;
    }
}

async function createNewClient(body) {
    try {
        const { username, first_name, last_name, email, phone, birth_date, treatment_status, skin_type } = body;
        const formattedBirthDate = new Date(birth_date).toISOString().split('T')[0];

        const userQuery = 'INSERT INTO users (username, first_name, last_name, email, phone, birth_date, created_at, role_id) VALUES (?,?,?,?,?,?,NOW(),?)';
        const [userResult] = await pool.query(userQuery, ['default_username', first_name, last_name, email, phone, formattedBirthDate, 2]);

        const userId = userResult.insertId;

        const clientQuery = 'INSERT INTO clients (client_id, treatment_status, skin_type) VALUES (?,?,?)';
        await pool.query(clientQuery, [userId, treatment_status, skin_type]);

        return { userId, ok: true };
    } catch (err) {
        console.error('Error creating client: ', err);
        throw err;
    }
}

async function insertPasswordResetToken(tokenId, userId, expiresAt) {
    const query = `
        INSERT INTO password_reset_tokens (token_id, user_id, expires_at)
        VALUES (?, ?, ?)
    `;
    await pool.query(query, [tokenId, userId, expiresAt]);
}


async function updateUsername(userId, username) {
    try {
        const query = 'UPDATE users SET username = ? WHERE user_id = ?';
        await pool.query(query, [username, userId]);
    } catch (err) {
        console.error('Error updating username in model:', err);
        throw err;
    }
}

async function getClientsByProductId(productId) {
    try {
        const sql = `SELECT DISTINCT 
                     u.user_id, 
                     u.first_name, 
                     u.last_name, 
                     i.image_path AS profile_image
                     FROM recommendations r
                     JOIN users u ON r.client_id = u.user_id
                     LEFT JOIN images i 
                     ON i.user_id = u.user_id 
                     AND i.image_type = 'profile'
                     WHERE r.product_id = ?;
                    `;
        const [result] = await pool.query(sql, [productId]);

        return { success: true, message: "clients fetched successfully", clients: result || [] };
    } catch (err) {
        console.error("Error fetching clients:", err);
        return { success: false, message: "Error fetching clients", clients: [] };
    }
};

async function deleteClient(id) {
    try {
        const query = 'DELETE FROM users WHERE user_id = ?';
        await pool.query(query, [id]);
    } catch (err) {
        console.error('Error deleting client:', err);
        throw err;
    }
}

async function getClientsCount() {
    try {
        const sql = `SELECT COUNT(*) AS total FROM users u JOIN clients c ON u.user_id = c.client_id WHERE u.role_id = 2;`;
        const [result] = await pool.query(sql);
        return result[0].total;
    } catch (err) {
        console.error("Error:", err);
        throw new Error(err.message);
    }
}

module.exports = { getAllClients, searchClientsByName, filterClients, getClientsCount, getClient, updateClient, getUniqueUsername, createNewClient, insertPasswordResetToken, updateUsername, getClientsByProductId, deleteClient };
