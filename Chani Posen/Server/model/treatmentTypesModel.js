const pool = require('../DB.js');

async function getTreatmentTypes() {
    try {
        const [rows] = await pool.query(`
            SELECT
                treatment_type_id,
                treatment_name,
                default_price,
                default_duration
            FROM treatment_types
            WHERE is_active = TRUE
            ORDER BY treatment_name
        `);

        return {
            success: true,
            treatmentTypes: rows
        };

    } catch (error) {
        console.error(
            "Error getting treatment types:",
            error
        );

        throw error;
    }
}

module.exports = {
    getTreatmentTypes
};