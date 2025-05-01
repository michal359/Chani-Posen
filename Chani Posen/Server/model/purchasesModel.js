const pool = require('../DB.js');

async function getClientsPurchasesById(clientId) {
    try {
        const query = `
            SELECT 
                p.product_id, 
                p.product_name, 
                p.product_description, 
                p.purchase_count, 
                p.product_price, 
                pu.purchase_date, 
                pu.status,
                pu.purchase_id, 
                i.image_path
            FROM purchases pu
            JOIN products p ON pu.product_id = p.product_id
            LEFT JOIN images i ON p.product_id = i.product_id AND i.image_type = 'product'
            WHERE pu.client_id = ?;
        `;

        const [rows] = await pool.execute(query, [clientId]);

        return { success: true, message: "Successfully retrieved client purchases", purchases: rows };
    }
    catch (err) {
        console.error('Error getting purchases for client with id:', clientId, err);
        return { success: false, message: err.message };
    }
};

async function deletePurchase(purchaseId) {
    try {
        const query = `DELETE FROM purchases WHERE purchase_id = ?;`;
        await pool.execute(query, [purchaseId]);

        return { success: true, message: "רכישה נמחקה בהצלחה" };
    } catch (err) {
        console.error('Error deleting purchase with id:', purchaseId, err);
        return { success: false, message: err.message };
    }
}

async function updatePurchaseStatus(body, purchaseId) {
    const status = body.status;
    try {
        const query = `UPDATE purchases SET status = ? WHERE purchase_id = ?`;
        await pool.execute(query, [status, purchaseId]);

        return { success: true, message: "Successfully updated purchase" };
    } catch (err) {
        console.error('Error editing purchase with id:', purchaseId, err);
        return { success: false, message: err.message };
    }
}

async function addPurchase(body) {
    const {clientId, productId, status} = body;
    try {
        const query = `INSERT INTO purchases (client_id, product_id, status) VALUES (?,?,?)`;
        const [purchaseResult] = await pool.execute(query, [clientId, productId, status]);

        const updateQuery = `UPDATE products SET purchase_count = purchase_count + 1 WHERE product_id = ?`;
        await pool.execute(updateQuery, [productId]);

        return { success: true, message: "Successfully added purchase", purchaseId: purchaseResult.insertId };
    } catch (err) {
        console.error('Error adding purchase with id:', purchaseId, err);
        return { success: false, message: err.message };
    }
}

module.exports = { getClientsPurchasesById, deletePurchase, updatePurchaseStatus, addPurchase };