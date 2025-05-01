const pool = require('../DB.js');

async function getNotificationsById(id) {
    try {
        const query = `
            SELECT *
            FROM notifications 
            WHERE user_id = ?;
        `;
        const [rows] = await pool.execute(query, [id]);

        return { success: true, message: "Successfully retrieved notifications", notifications: rows };
    }
    catch (err) {
        console.error('Error getting notifications for user_id:', id, err);
        return { success: false, message: err.message };
    }
};

async function getUnreadNotificationsCount(id) {
    try {
        const query = `
            SELECT COUNT(*) AS count
            FROM notifications
            WHERE user_id = ? AND is_read = false;
        `;
        const [rows] = await pool.execute(query, [id]);
        return rows[0].count;
    } catch (err) {
        console.error("Error counting unread notifications:", err);
        throw err;
    }
}

async function addNotification(user_id, notification_text, notification_type, entity_type, entity_id, link) {
    try {
        // בדיקה אם קיימת התראה זהה בשבעת הימים האחרונים
        const duplicateCheckQuery = `
            SELECT * FROM notifications 
            WHERE user_id = ?
              AND notification_type = ?
              AND entity_type = ?
              AND entity_id = ?
              AND created_at >= NOW() - INTERVAL 7 DAY
            ORDER BY created_at DESC
            LIMIT 1;
        `;
        const [existing] = await pool.execute(duplicateCheckQuery, [
            user_id,
            notification_type,
            entity_type,
            entity_id
        ]);

        // אם קיימת - נעדכן את השדה times_sent ונחזיר
        if (existing.length > 0) {
            const notificationId = existing[0].notification_id;
            const updateQuery = `
                UPDATE notifications 
                SET times_sent = times_sent + 1, updated_at = CURRENT_TIMESTAMP 
                WHERE notification_id = ?;
            `;
            await pool.execute(updateQuery, [notificationId]);

            return { success: true, message: "Notification already exists - updated", notification_id: notificationId };
        }

        // בדיקה כמה התראות דומות קיימות בסה"כ (גם ישנות יותר)
        const countQuery = `
            SELECT COUNT(*) AS count FROM notifications 
            WHERE user_id = ?
              AND notification_type = ?
              AND entity_type = ?
              AND entity_id = ?;
        `;
        const [countResult] = await pool.execute(countQuery, [
            user_id,
            notification_type,
            entity_type,
            entity_id
        ]);
        const count = countResult[0].count;

        // הגבלה לשלוש התראות דומות
        if (count >= 3) {
            return { success: false, message: "Max notification limit reached for this entity" };
        }

        // הוספת התראה חדשה
        const insertQuery = `
            INSERT INTO notifications 
            (user_id, notification_text, notification_type, entity_type, entity_id, link)
            VALUES (?, ?, ?, ?, ?, ?);
        `;
        const [result] = await pool.execute(insertQuery, [
            user_id,
            notification_text,
            notification_type,
            entity_type,
            entity_id,
            link
        ]);

        return { success: true, message: "Notification added successfully", notification_id: result.insertId };

    } catch (err) {
        console.error("Error adding notification:", err);
        return { success: false, message: err.message };
    }
}



module.exports = { getNotificationsById, getUnreadNotificationsCount, addNotification };