const pool = require('../DB.js');

async function getImagesByClientId(clientId) {
    try {
        const query = `
            SELECT 
    i.image_id,
    i.image_path,
    i.description,
    i.uploaded_at,
    u.username AS uploaded_by,
    u.first_name,
    u.last_name
FROM images i
JOIN users u ON i.uploaded_by = u.user_id
WHERE i.user_id = ? 
  AND i.image_type = 'treatment';
        `;
        const [rows] = await pool.execute(query, [clientId]);

        return { success: true, message: "Successfully retrieved treatment images", images: rows };
    } catch (err) {
        console.error('Error getting treatment images for user with id:', clientId, err);
        return { success: false, message: err.message };
    }
}

async function deleteImage(imageId) {
    try {
        const query = `DELETE FROM images WHERE image_id = ?;`;
        await pool.execute(query, [imageId]);
        return { success: true, message: "Successfully deleted treatment image" };
    } catch (err) {
        console.error('Error deleting treatment images with id:', imageId, err);
        return { success: false, message: err.message };
    }
}

module.exports = { getImagesByClientId, deleteImage };