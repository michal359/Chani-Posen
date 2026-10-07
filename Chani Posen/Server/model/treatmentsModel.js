const pool = require('../DB.js');

async function getTreatmentsByClientId(id) {
    try {
        const query = `
            SELECT
                t.treatment_id,
                t.client_id,

                t.treatment_type_id,
                tt.treatment_name,

                -- TEMPORARY backward compatibility for React
                tt.treatment_name AS treatment_type,

                t.treatment_date,
                t.duration,
                t.summary,

                t.treatment_price,
                t.amount_paid,
                t.is_special_price,
                t.price_note,

                -- Current debt for this specific treatment
                GREATEST(
                    t.treatment_price - t.amount_paid,
                    0
                ) AS debt,

                -- Computed status - not stored in DB
                CASE
                    WHEN t.amount_paid >= t.treatment_price
                        THEN 'Paid'
                    ELSE 'Unpaid'
                END AS status,

                -- TEMPORARY backward compatibility for React
                t.treatment_price AS amount

            FROM treatments t

            JOIN treatment_types tt
                ON tt.treatment_type_id = t.treatment_type_id

            WHERE t.client_id = ?

            ORDER BY t.treatment_date DESC;
        `;

        const [rows] = await pool.execute(query, [id]);

        return {
            success: true,
            message: "Successfully retrieved treatments",
            treatments: rows
        };

    } catch (err) {
        console.error(
            'Error getting treatments for client with id:',
            id,
            err
        );

        return {
            success: false,
            message: err.message
        };
    }
}


async function deleteTreatment(id) {
    try {
        // First check whether money was already paid for this treatment
        const [rows] = await pool.query(
            `
            SELECT amount_paid
            FROM treatments
            WHERE treatment_id = ?
            `,
            [id]
        );

        if (rows.length === 0) {
            throw new Error("Treatment not found");
        }

        if (Number(rows[0].amount_paid) > 0) {
            throw new Error(
                "Cannot delete a treatment that already has payments"
            );
        }

        const [result] = await pool.query(
            `
            DELETE FROM treatments
            WHERE treatment_id = ?
            `,
            [id]
        );

        if (result.affectedRows === 0) {
            throw new Error("Treatment not found");
        }

        return {
            success: true,
            message: "Treatment deleted successfully"
        };

    } catch (err) {
        console.error("Error deleting treatment:", err);
        throw err;
    }
}


async function updateTreatment(body, id) {
    try {
        const treatmentId = id;

        // Get current treatment first
        const [existingRows] = await pool.query(
            `
            SELECT *
            FROM treatments
            WHERE treatment_id = ?
            `,
            [treatmentId]
        );

        if (existingRows.length === 0) {
            throw new Error(
                `Treatment with ID ${treatmentId} not found`
            );
        }

        const existingTreatment = existingRows[0];

        const summary =
            body.summary ?? existingTreatment.summary;

        const treatmentTypeId =
            body.treatment_type_id ??
            existingTreatment.treatment_type_id;

        const duration =
            body.duration ??
            existingTreatment.duration;

        // Temporary support for old React "amount"
        const treatmentPrice =
            body.treatment_price ??
            body.amount ??
            existingTreatment.treatment_price;

        let amountPaid =
            body.amount_paid ??
            existingTreatment.amount_paid;

        /*
            Temporary compatibility with old Paid / Unpaid toggle.

            Later, when we update React, this section will be removed.
        */
        if (
            body.amount_paid === undefined &&
            body.status !== undefined
        ) {
            if (body.status === "Paid") {
                amountPaid = treatmentPrice;
            }

            if (body.status === "Unpaid") {
                amountPaid = 0;
            }
        }

        const isSpecialPrice =
            body.is_special_price ??
            existingTreatment.is_special_price;

        const priceNote =
            body.price_note ??
            existingTreatment.price_note;

        if (Number(treatmentPrice) < 0) {
            throw new Error(
                "Treatment price cannot be negative"
            );
        }

        if (Number(amountPaid) < 0) {
            throw new Error(
                "Amount paid cannot be negative"
            );
        }

        if (Number(amountPaid) > Number(treatmentPrice)) {
            throw new Error(
                "Amount paid cannot be greater than treatment price. Extra money should be added to the client's wallet."
            );
        }

        const treatmentSql = `
            UPDATE treatments
            SET
                summary = ?,
                treatment_type_id = ?,
                duration = ?,
                treatment_price = ?,
                amount_paid = ?,
                is_special_price = ?,
                price_note = ?
            WHERE treatment_id = ?
        `;

        await pool.query(
            treatmentSql,
            [
                summary,
                treatmentTypeId,
                duration,
                treatmentPrice,
                amountPaid,
                isSpecialPrice,
                priceNote,
                treatmentId
            ]
        );

        const [updatedRows] = await pool.query(
            `
            SELECT
                t.treatment_id,
                t.client_id,
                t.treatment_type_id,
                tt.treatment_name,
                tt.treatment_name AS treatment_type,
                t.treatment_date,
                t.duration,
                t.summary,
                t.treatment_price,
                t.amount_paid,
                t.is_special_price,
                t.price_note,

                GREATEST(
                    t.treatment_price - t.amount_paid,
                    0
                ) AS debt,

                CASE
                    WHEN t.amount_paid >= t.treatment_price
                        THEN 'Paid'
                    ELSE 'Unpaid'
                END AS status,

                t.treatment_price AS amount

            FROM treatments t

            JOIN treatment_types tt
                ON tt.treatment_type_id = t.treatment_type_id

            WHERE t.treatment_id = ?
            `,
            [treatmentId]
        );

        return {
            success: true,
            message: `Treatment ${treatmentId} updated successfully`,
            treatment: updatedRows[0]
        };

    } catch (error) {
        console.error("Error updating treatment:", error);
        throw error;
    }
}


async function createTreatment(body) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const {
            client_id,
            treatment_type_id,
            treatment_date,
            duration,
            summary,
            treatment_price,
            is_special_price = false,
            price_note = "",
            payment_amount = 0
        } = body;

        let finalTreatmentPrice = treatment_price;

        // אם אין מחיר מיוחד - לקחת מחיר מהקטלוג
        if (
            finalTreatmentPrice === undefined ||
            finalTreatmentPrice === null ||
            finalTreatmentPrice === ""
        ) {
            const [typeRows] = await connection.query(
                `
                SELECT default_price
                FROM treatment_types
                WHERE treatment_type_id = ?
                  AND is_active = TRUE
                `,
                [treatment_type_id]
            );

            if (typeRows.length === 0) {
                throw new Error("סוג הטיפול לא נמצא.");
            }

            finalTreatmentPrice =
                Number(typeRows[0].default_price);
        }

        finalTreatmentPrice =
            Number(finalTreatmentPrice);

        const paymentAmount =
            Number(payment_amount || 0);

        if (finalTreatmentPrice < 0) {
            throw new Error("מחיר טיפול לא תקין.");
        }

        if (paymentAmount < 0) {
            throw new Error("סכום תשלום לא תקין.");
        }

        // כמה מתוך התשלום הולך לטיפול
        const amountAppliedToTreatment =
            Math.min(
                paymentAmount,
                finalTreatmentPrice
            );

        // עודף שנכנס לארנק
        const extraCredit =
            Math.max(
                paymentAmount - finalTreatmentPrice,
                0
            );

        // יצירת הטיפול
        const [result] = await connection.query(
            `
            INSERT INTO treatments (
                client_id,
                treatment_type_id,
                treatment_date,
                duration,
                summary,
                treatment_price,
                amount_paid,
                is_special_price,
                price_note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                client_id,
                treatment_type_id,
                treatment_date,
                duration,
                summary,
                finalTreatmentPrice,
                amountAppliedToTreatment,
                Boolean(is_special_price),
                price_note || null
            ]
        );

        const treatmentId =
            result.insertId;

        // אם התקבל תשלום
        if (paymentAmount > 0) {
            await connection.query(
                `
        INSERT INTO payments (
            client_id,
            payment_source,
            target_type,
            treatment_id,
            purchase_id,
            amount_received,
            amount_applied,
            note
        )
        VALUES (?, 'DIRECT', 'TREATMENT', ?, NULL, ?, ?, ?)
        `,
                [
                    client_id,
                    treatmentId,
                    paymentAmount,
                    amountAppliedToTreatment,
                    "תשלום בעת הוספת טיפול"
                ]
            );
        }


        // אם שולם יותר ממחיר הטיפול
        if (extraCredit > 0) {

            // לוודא שיש ארנק ללקוח
            await connection.query(
                `
        INSERT IGNORE INTO wallets (
            client_id,
            credit_balance
        )
        VALUES (?, 0)
        `,
                [client_id]
            );


            // הוספת העודף ליתרת הזכות
            await connection.query(
                `
        UPDATE wallets
        SET credit_balance = credit_balance + ?
        WHERE client_id = ?
        `,
                [
                    extraCredit,
                    client_id
                ]
            );


            // תיעוד העודף שהועבר ליתרת הזכות
            await connection.query(
                `
        INSERT INTO payments (
            client_id,
            payment_source,
            target_type,
            treatment_id,
            purchase_id,
            amount_received,
            amount_applied,
            note
        )
        VALUES (?, 'DIRECT', 'WALLET_CREDIT', ?, NULL, 0, ?, ?)
        `,
                [
                    client_id,
                    treatmentId,
                    extraCredit,
                    `עודף מתשלום על טיפול ${treatmentId} - הועבר ליתרת זכות`
                ]
            );
        }

        await connection.commit();

        return {
            success: true,
            treatment_id: treatmentId
        };

    } catch (error) {
        await connection.rollback();

        console.error(
            "Error creating treatment:",
            error
        );

        throw error;

    } finally {
        connection.release();
    }
}


module.exports = {
    getTreatmentsByClientId,
    deleteTreatment,
    updateTreatment,
    createTreatment
};