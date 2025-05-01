const pool = require('../DB.js');

async function getTreatmentsByClientId(id) {
    try {
        const query = `
            SELECT 
                treatment_id, 
                client_id, 
                treatment_type, 
                treatment_date, 
                duration, 
                summary, 
                status, 
                amount
            FROM treatments
            WHERE client_id = ?;
        `;

        const [rows] = await pool.execute(query, [id]);

        return { success: true, message: "Successfully retrieved treatments", treatments: rows };
    }
    catch (err) {
        console.error('Error getting treatments for client with id:', id, err);
        return { success: false, message: err.message };
    }
};

async function deleteTreatment(id) {
    try {
        const sql = `DELETE FROM treatments WHERE treatment_id = ?;`;
        const [result] = await pool.query(sql, [id]);

        if (result.affectedRows > 0) {
            console.log("Treatment deleted successfully for id:", id);
            return { success: true, message: "Treatment deleted successfully" };
        } else {
            console.log("No treatment found for id:", id);
            throw new Error("Treatment not found");
        }
    } catch (err) {
        console.error("Error deleting treatment:", err);
        throw new Error(err.message);
    }
}

async function updateTreatment(body, id) {
    try {
        const treatment_id = id; // מזהה הטיפול
        const { summary, status, amount } = body;

        // בדיקת ערכים בסיסית
        if (!summary || !status) {
            throw new Error("Missing required fields: summary or status");
        }

        // הגדרת שאילתה לעדכון הטיפול
        const treatmentSql = `
            UPDATE treatments 
            SET summary = ?, status = ?, amount = ? 
            WHERE treatment_id = ?`;

        // שליחת השאילתה לבסיס הנתונים
        await pool.query(treatmentSql, [summary, status, amount || 0.00, treatment_id]);

        // שאילתה להחזרת הטיפול המעודכן
        const getUpdatedTreatmentSql = `
            SELECT * 
            FROM treatments 
            WHERE treatment_id = ?`;

        const [updatedTreatment] = await pool.query(getUpdatedTreatmentSql, [treatment_id]);

        if (updatedTreatment.length === 0) {
            throw new Error(`Treatment with ID ${treatment_id} not found`);
        }

        return {
            success: true,
            message: `Treatment ${treatment_id} updated successfully`,
            treatment: updatedTreatment[0],
        };

    } catch (error) {
        console.error("Error updating treatment:", error);
        throw error;
    }
}

async function createTreatment(body) {
    try {
        console.log("Inserting into DB:", body); // בדיקה לפני ההכנסה ל-DB
        const { client_id, treatment_type, treatment_date, duration, summary, status, amount } = body;
        if (!client_id || !treatment_type || !treatment_date || isNaN(duration) || !summary || isNaN(amount)) {
            console.error("Invalid data format:", body);
            throw new Error("Invalid data format: Missing or incorrect fields");
        }

        const sql = `
            INSERT INTO treatments (
                client_id, 
                treatment_type, 
                treatment_date, 
                duration, 
                summary, 
                status, 
                amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(sql, [
            client_id, 
            treatment_type, 
            treatment_date, 
            duration, 
            summary, 
            status, 
            amount
        ]);

        return { success: true, treatment_id: result.insertId };
    } catch (error) {
        console.error("Database error:", error);
        throw error;
    }
}


module.exports = { getTreatmentsByClientId, deleteTreatment, updateTreatment, createTreatment };
