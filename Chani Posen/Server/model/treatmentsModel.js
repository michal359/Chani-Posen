
const pool = require('../DB.js');

function id(value, field) {
    const n = Number(value);

    if (!Number.isSafeInteger(n) || n <= 0) {
        throw new Error(`Invalid ${field}`);
    }

    return n;
}

function cents(value, field = 'amount') {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        throw new Error(`Invalid ${field}`);
    }

    const n = Number(value);

    if (
        !Number.isFinite(n) ||
        n < 0 ||
        Math.abs(n * 100 - Math.round(n * 100)) > 1e-7
    ) {
        throw new Error(`Invalid ${field}`);
    }

    return Math.round(n * 100);
}

function money(amountInCents) {
    return (amountInCents / 100).toFixed(2);
}

function sqlDate(value) {
    if (
        value instanceof Date &&
        !Number.isNaN(value.getTime())
    ) {
        const local = new Date(
            value.getTime() -
            value.getTimezoneOffset() * 60000
        );

        return local.toISOString()
            .slice(0, 19)
            .replace('T', ' ');
    }

    if (typeof value !== 'string') {
        throw new Error('Invalid treatment date');
    }

    const s = value.trim().replace('T', ' ');

    if (
        !/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(s)
    ) {
        throw new Error('Invalid treatment date');
    }

    const [date, time] = s.split(' ');
    const [y, m, d] = date.split('-').map(Number);

    const test = new Date(Date.UTC(y, m - 1, d));

    if (
        test.getUTCFullYear() !== y ||
        test.getUTCMonth() !== m - 1 ||
        test.getUTCDate() !== d
    ) {
        throw new Error('Invalid treatment date');
    }

    return `${date} ${
        time
            ? time.length === 5
                ? time + ':00'
                : time
            : '12:00:00'
    }`;
}

function validDuration(value) {
    const n = Number(value);

    if (!Number.isSafeInteger(n) || n <= 0) {
        throw new Error('Invalid duration');
    }

    return n;
}

async function transaction(action) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const result = await action(connection);

        await connection.commit();

        return result;

    } catch (err) {
        await connection.rollback();
        throw err;

    } finally {
        connection.release();
    }
}

// --------------------------------------------------
// 1. Get treatments
// --------------------------------------------------
async function getTreatmentsByClientId(clientId) {
    try {
        const [rows] = await pool.execute(`
            SELECT
                t.*,
                tt.treatment_name,
                tt.treatment_name AS treatment_type,

                GREATEST(
                    t.treatment_price - t.amount_paid,
                    0
                ) AS debt,

                CASE
                    WHEN t.amount_paid >= t.treatment_price
                        THEN 'Paid'
                    ELSE 'Unpaid'
                END AS status,

                t.treatment_price AS amount,

                CASE
                    WHEN t.amount_paid = 0
                    AND NOT EXISTS (
                        SELECT 1
                        FROM payments p
                        WHERE p.treatment_id = t.treatment_id
                    )
                    THEN 1
                    ELSE 0
                END AS can_delete

            FROM treatments t

            JOIN treatment_types tt
                ON tt.treatment_type_id =
                   t.treatment_type_id

            WHERE t.client_id = ?

            ORDER BY
                t.treatment_date DESC,
                t.treatment_id DESC
        `, [id(clientId, 'clientId')]);

        return {
            success: true,
            message: 'Successfully retrieved treatments',
            treatments: rows
        };

    } catch (err) {
        console.error('Error getting treatments:', err);

        return {
            success: false,
            message: err.message
        };
    }
}

// --------------------------------------------------
// 2. Wallet helper
// --------------------------------------------------
async function lockWallet(connection, clientId) {
    await connection.execute(
        `INSERT IGNORE INTO wallets (
            client_id,
            credit_balance
        ) VALUES (?, 0)`,
        [clientId]
    );

    const [[wallet]] = await connection.execute(
        `SELECT credit_balance
         FROM wallets
         WHERE client_id = ?
         FOR UPDATE`,
        [clientId]
    );

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    return cents(
        wallet.credit_balance,
        'wallet balance'
    );
}

// --------------------------------------------------
// 3. Shared treatment payment logic
// --------------------------------------------------
async function applyTreatmentPayment(
    connection,
    treatment,
    directCents,
    walletCents
) {
    const price = cents(
        treatment.treatment_price,
        'treatment price'
    );

    const paid = cents(
        treatment.amount_paid,
        'amount paid'
    );

    const debt = price - paid;

    if (debt < 0) {
        throw new Error(
            'Treatment has inconsistent payment data'
        );
    }

    if (directCents === 0 && walletCents === 0) {
        return {
            amount_paid: money(paid),
            debt: money(debt)
        };
    }

    const clientId = treatment.client_id;

    const walletBalance = await lockWallet(
        connection,
        clientId
    );

    if (walletCents > walletBalance) {
        throw new Error(
            'Insufficient wallet balance'
        );
    }

    if (walletCents > debt) {
        throw new Error(
            'Wallet payment exceeds treatment debt'
        );
    }

    const directApplied = Math.min(
        directCents,
        debt - walletCents
    );

    const excess = directCents - directApplied;

    const updatedPaid =
        paid + directApplied + walletCents;

    const updatedWallet =
        walletBalance - walletCents + excess;

    // Register direct payment.
    if (directCents > 0) {
        await connection.execute(`
            INSERT INTO payments (
                client_id,
                payment_source,
                target_type,
                treatment_id,
                amount_received,
                amount_applied,
                note
            )
            VALUES (
                ?, 'DIRECT', 'TREATMENT', ?, ?, ?, ?
            )
        `, [
            clientId,
            treatment.treatment_id,
            money(directCents),
            money(directApplied),
            excess > 0
                ? `Treatment payment; ${
                    money(excess)
                  } credited to wallet`
                : 'Direct treatment payment'
        ]);
    }

    // Register wallet payment.
    if (walletCents > 0) {
        await connection.execute(`
            INSERT INTO payments (
                client_id,
                payment_source,
                target_type,
                treatment_id,
                amount_received,
                amount_applied,
                note
            )
            VALUES (
                ?, 'WALLET', 'TREATMENT', ?, 0, ?, ?
            )
        `, [
            clientId,
            treatment.treatment_id,
            money(walletCents),
            'Treatment payment from wallet'
        ]);
    }

    await connection.execute(
        `UPDATE treatments
         SET amount_paid = ?
         WHERE treatment_id = ?`,
        [
            money(updatedPaid),
            treatment.treatment_id
        ]
    );

    await connection.execute(
        `UPDATE wallets
         SET credit_balance = ?
         WHERE client_id = ?`,
        [
            money(updatedWallet),
            clientId
        ]
    );

    return {
        amount_paid: money(updatedPaid),
        debt: money(price - updatedPaid),
        wallet_balance: money(updatedWallet),
        excess_to_wallet: money(excess)
    };
}

// --------------------------------------------------
// 4. Delete unpaid treatment
// --------------------------------------------------
async function deleteTreatment(treatmentId) {
    return transaction(async (connection) => {
        const treatmentIdNumber = id(
            treatmentId,
            'treatmentId'
        );

        const [[existing]] = await connection.execute(
            `SELECT treatment_id, amount_paid
             FROM treatments
             WHERE treatment_id = ?
             FOR UPDATE`,
            [treatmentIdNumber]
        );

        if (!existing) {
            throw new Error('Treatment not found');
        }

        if (cents(existing.amount_paid) > 0) {
            throw new Error(
                'Cannot delete a treatment that has been paid'
            );
        }

        const [[history]] = await connection.execute(
            `SELECT COUNT(*) AS total
             FROM payments
             WHERE treatment_id = ?`,
            [treatmentIdNumber]
        );

        if (Number(history.total) > 0) {
            throw new Error(
                'Cannot delete a treatment with payment history'
            );
        }

        await connection.execute(
            `DELETE FROM treatments
             WHERE treatment_id = ?`,
            [treatmentIdNumber]
        );

        return {
            success: true,
            message: 'Treatment deleted successfully'
        };
    });
}

// --------------------------------------------------
// 5. Update treatment details and price
// --------------------------------------------------
async function updateTreatment(body, treatmentId) {
    return transaction(async (connection) => {
        const treatmentIdNumber = id(
            treatmentId,
            'treatmentId'
        );

        const [[existing]] = await connection.execute(
            `SELECT *
             FROM treatments
             WHERE treatment_id = ?
             FOR UPDATE`,
            [treatmentIdNumber]
        );

        if (!existing) {
            throw new Error('Treatment not found');
        }

        // Editing treatment details is not a payment.
        if (
            body.amount_paid !== undefined ||
            body.status !== undefined ||
            body.payment_amount !== undefined ||
            body.directAmount !== undefined ||
            body.walletAmount !== undefined
        ) {
            throw new Error(
                'Use a payment operation to add or change payments'
            );
        }

        const typeId = id(
            body.treatment_type_id ??
                existing.treatment_type_id,
            'treatment_type_id'
        );

        const [[type]] = await connection.execute(
            `SELECT treatment_type_id
             FROM treatment_types
             WHERE treatment_type_id = ?`,
            [typeId]
        );

        if (!type) {
            throw new Error('Treatment type not found');
        }

        const newPrice = cents(
            body.treatment_price ??
                body.amount ??
                existing.treatment_price,
            'treatment_price'
        );

        const paid = cents(
            existing.amount_paid,
            'amount_paid'
        );

        const duration = validDuration(
            body.duration ?? existing.duration
        );

        const date =
            body.treatment_date === undefined
                ? existing.treatment_date
                : sqlDate(body.treatment_date);

        const summary =
            body.summary === undefined
                ? existing.summary
                : body.summary;

        const special =
            body.is_special_price === undefined
                ? Boolean(existing.is_special_price)
                : Boolean(body.is_special_price);

        const note = special
            ? body.price_note ??
                existing.price_note ??
                null
            : null;

        // Refund the difference to the wallet
        // if price drops below amount already paid.
        const credit = Math.max(
            0,
            paid - newPrice
        );

        if (credit > 0) {
            const currentWallet = await lockWallet(
                connection,
                existing.client_id
            );

            await connection.execute(
                `UPDATE wallets
                 SET credit_balance = ?
                 WHERE client_id = ?`,
                [
                    money(currentWallet + credit),
                    existing.client_id
                ]
            );

            await connection.execute(`
                INSERT INTO payments (
                    client_id,
                    payment_source,
                    target_type,
                    treatment_id,
                    amount_received,
                    amount_applied,
                    note
                )
                VALUES (
                    ?, 'DIRECT', 'WALLET_CREDIT',
                    ?, 0, ?, ?
                )
            `, [
                existing.client_id,
                treatmentIdNumber,
                money(credit),
                `Refund to wallet after treatment price reduction (${
                    money(paid)
                } to ${money(newPrice)})`
            ]);
        }

        await connection.execute(`
            UPDATE treatments
            SET
                treatment_type_id = ?,
                treatment_date = ?,
                duration = ?,
                summary = ?,
                treatment_price = ?,
                amount_paid = ?,
                is_special_price = ?,
                price_note = ?
            WHERE treatment_id = ?
        `, [
            typeId,
            date,
            duration,
            summary,
            money(newPrice),
            money(Math.min(paid, newPrice)),
            special ? 1 : 0,
            note,
            treatmentIdNumber
        ]);

        const [[updated]] = await connection.execute(`
            SELECT
                t.*,
                tt.treatment_name,
                tt.treatment_name AS treatment_type,

                GREATEST(
                    t.treatment_price - t.amount_paid,
                    0
                ) AS debt,

                t.treatment_price AS amount,

                CASE
                    WHEN t.amount_paid >= t.treatment_price
                        THEN 'Paid'
                    ELSE 'Unpaid'
                END AS status

            FROM treatments t

            JOIN treatment_types tt
                ON tt.treatment_type_id =
                   t.treatment_type_id

            WHERE t.treatment_id = ?
        `, [treatmentIdNumber]);

        return {
            success: true,
            message: 'Treatment updated successfully',
            treatment: updated,
            refund_to_wallet: money(credit)
        };
    });
}

// --------------------------------------------------
// 6. Create treatment
// --------------------------------------------------
async function createTreatment(body) {
    return transaction(async (connection) => {
        const clientId = id(
            body.client_id ?? body.clientId,
            'client_id'
        );

        const typeId = id(
            body.treatment_type_id,
            'treatment_type_id'
        );

        const [[type]] = await connection.execute(
            `SELECT default_price
             FROM treatment_types
             WHERE treatment_type_id = ?
             AND is_active = TRUE`,
            [typeId]
        );

        if (!type) {
            throw new Error(
                'Treatment type not found or inactive'
            );
        }

        const price = cents(
            body.treatment_price === undefined ||
            body.treatment_price === ''
                ? type.default_price
                : body.treatment_price,
            'treatment_price'
        );

        const duration = validDuration(
            body.duration
        );

        const date = sqlDate(
            body.treatment_date
        );

        // Keep compatibility with the old form.
        const direct = cents(
            body.directAmount ??
                body.direct_amount ??
                body.payment_amount ??
                0,
            'direct payment'
        );

        const fromWallet = cents(
            body.walletAmount ??
                body.wallet_amount ??
                0,
            'wallet payment'
        );

        const [result] = await connection.execute(`
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
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        `, [
            clientId,
            typeId,
            date,
            duration,
            body.summary ?? null,
            money(price),
            body.is_special_price ? 1 : 0,
            body.price_note || null
        ]);

        const payment = await applyTreatmentPayment(
            connection,
            {
                treatment_id: result.insertId,
                client_id: clientId,
                treatment_price: money(price),
                amount_paid: '0.00'
            },
            direct,
            fromWallet
        );

        return {
            success: true,
            treatment_id: result.insertId,
            ...payment
        };
    });
}

// --------------------------------------------------
// 7. Add a new payment to an existing treatment
// --------------------------------------------------
async function addTreatmentPayment(body, treatmentId) {
    return transaction(async (connection) => {
        const treatmentIdNumber = id(
            treatmentId,
            'treatmentId'
        );

        const [[treatment]] = await connection.execute(
            `SELECT *
             FROM treatments
             WHERE treatment_id = ?
             FOR UPDATE`,
            [treatmentIdNumber]
        );

        if (!treatment) {
            throw new Error('Treatment not found');
        }

        const direct = cents(
            body.directAmount ??
                body.direct_amount ??
                0,
            'directAmount'
        );

        const wallet = cents(
            body.walletAmount ??
                body.wallet_amount ??
                0,
            'walletAmount'
        );

        if (direct === 0 && wallet === 0) {
            throw new Error(
                'Enter a payment amount'
            );
        }

        const payment = await applyTreatmentPayment(
            connection,
            treatment,
            direct,
            wallet
        );

        return {
            success: true,
            message: 'Treatment payment recorded',
            ...payment
        };
    });
}

module.exports = {
    getTreatmentsByClientId,
    deleteTreatment,
    updateTreatment,
    createTreatment,
    addTreatmentPayment
};
