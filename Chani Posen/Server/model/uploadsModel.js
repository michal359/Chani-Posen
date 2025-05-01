const pool = require('../DB.js');

async function saveImagePath({ userId, productId, image_type, dbPath, description, uploaded_by }) {
    try {
        
    if (!userId || !image_type || !dbPath || !uploaded_by) {
        console.error("Missing fields:", { userId, image_type, dbPath, uploaded_by });
        throw new Error("Missing required fields: userId, image_type, dbPath, uploaded_by");
    }

        const query = `
            INSERT INTO images (user_id, product_id, image_type, image_path, description, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const fullDbPath = `http://localhost:3000${dbPath}`;

        let finalDescription = description;
        if (!description) {
            if (image_type === "profile") {
                finalDescription = `Profile picture for user ${userId}`;
            } else if (image_type === "product") {
                finalDescription = `Product image for product ${productId}`;
            } else if (image_type === "treatment") {
                finalDescription = `Treatment image for user ${userId}`;
            }
        }

        await pool.execute(query, [
            userId,
            productId ? productId : null,
            image_type,
            fullDbPath,
            finalDescription,
            uploaded_by
        ]);        
        
        return { success: true, message: "Image path saved successfully", imagePath: fullDbPath };
    } catch (err) {
        console.error("Error saving image path:", err);
        return { success: false, message: err.message };
    }
}

async function getUserProfileImage(userId) {
    try {
        const [rows] = await pool.execute(
            "SELECT image_path FROM images WHERE user_id = ? AND image_type = 'profile' LIMIT 1",
            [userId]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error("Error getting user profile image:", err);
        return null;
    }
}

async function deleteUserProfileImage(userId) {
    try {
        await pool.execute(
            "DELETE FROM images WHERE user_id = ? AND image_type = 'profile'",
            [userId]
        );
        return { success: true };
    } catch (err) {
        console.error("Error deleting user profile image:", err);
        return { success: false, message: err.message };
    }
}

async function getProductImage(productId) {
    try {
        const [rows] = await pool.execute(
            "SELECT image_path FROM images WHERE product_id = ? AND image_type = 'product' LIMIT 1",
            [productId]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error("Error getting product image:", err);
        return null;
    }
}

async function deleteProductImage(productId) {
    try {
        await pool.execute(
            "DELETE FROM images WHERE product_id = ? AND image_type = 'product'",
            [productId]
        );
        return { success: true };
    } catch (err) {
        console.error("Error deleting product image:", err);
        return { success: false, message: err.message };
    }
}

async function getTreatmentImage(userId) {
    try {
        const [rows] = await pool.execute(
            "SELECT image_path FROM images WHERE user_id = ? AND image_type = 'treatment' LIMIT 1",
            [userId]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error("Error getting treatment image:", err);
        return null;
    }
}

async function deleteUserTreatmentImage(image_id) {
    try {
        await pool.execute(
            "DELETE FROM images WHERE image_id = ? AND image_type = 'treatment'",
            [image_id]
        );
        return { success: true };
    } catch (err) {
        console.error("Error deleting user treatment image:", err);
        return { success: false, message: err.message };
    }
}



module.exports = { saveImagePath, getUserProfileImage, deleteUserProfileImage, deleteProductImage, getProductImage, getTreatmentImage, deleteUserTreatmentImage };
