const pool = require('../DB.js');

async function addRecommendation(body) {
    try {
        const { productId, clientId } = body;

        const checkRecommendationQuery = `
            SELECT recommendation_id, created_at FROM recommendations 
            WHERE client_id = ? AND product_id = ?
        `;
        const [existingRecommendation] = await pool.execute(checkRecommendationQuery, [clientId, productId]);

        if (existingRecommendation.length > 0) {
            return {
                success: true,
                message: "המלצה על המוצר הזה כבר קיימת",
                createdAt: existingRecommendation[0].created_at,
                recommendationId: existingRecommendation[0].recommendation_id,
                alreadyExists: true
            };
        }

        const recommendationQuery = `
            INSERT INTO recommendations (client_id, product_id)
            VALUES (?, ?)
        `;
        const [recommendationResult] = await pool.execute(recommendationQuery, [clientId, productId]);

        if (!recommendationResult.insertId) {
            throw new Error("Failed to insert recommendation");
        }

        const recommendationId = recommendationResult.insertId;

        const getRecommendationQuery = `
            SELECT created_at FROM recommendations WHERE recommendation_id = ?
        `;
        const [recommendationData] = await pool.execute(getRecommendationQuery, [recommendationId]);
        const createdAt = recommendationData.length > 0 ? recommendationData[0].created_at : null;

        return {
            success: true,
            message: "Successfully added recommendation",
            createdAt,
            recommendationId,
            alreadyExists: false
        };

    } catch (err) {
        console.error('Error in addRecommendation:', err);
        return {
            success: false,
            error: err.message || "Unknown error occurred"
        };
    }
}


async function getRecommendations(clientId) {
    try {
        const query = `
        SELECT 
            r.recommendation_id,
            r.created_at,
            p.product_id, 
            p.product_name, 
            p.product_price, 
            p.product_description, 
            i.image_path
        FROM recommendations r
        JOIN products p ON r.product_id = p.product_id
        LEFT JOIN images i ON p.product_id = i.product_id AND i.image_type = 'product'
        WHERE r.client_id = ?;
        `;
        const [rows] = await pool.execute(query, [clientId]);
        return { success: true, message: "Successfully retrieved recommendations", recommendations: rows };
    } catch (err) {
        console.error('Error getting recommendations', err);
        return { success: false, message: err.message };
    }
}

async function deleteRecommendation(recommendationId) {
    try {
        const query = `DELETE FROM recommendations WHERE recommendation_id = ?;`;
        const [result] = await pool.execute(query, [recommendationId]);

        if (result.affectedRows > 0) {
            return { success: true, message: "ההמלצה נמחקה בהצלחה" };
        } else {
            return { success: false, message: "לא נמצאה המלצה למוצר זה" };
        }
    } catch (err) {
        console.error('Error deleting recommendation for product_id:', recommendationId, err);
        return { success: false, message: err.message };
    }
}


module.exports = { addRecommendation, getRecommendations, deleteRecommendation };