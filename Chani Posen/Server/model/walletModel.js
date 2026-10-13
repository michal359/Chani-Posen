
const pool = require("../DB.js");

// ---------------------------------------------
// Helpers
// ---------------------------------------------
function validClientId(value) {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Invalid client ID");
    }

    return id;
}

function toCents(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        throw new Error("יש להזין סכום תקין");
    }

    const number = Number(value);

    if (
        !Number.isFinite(number) ||
        number <= 0 ||
        Math.abs(
            number * 100 - Math.round(number * 100)
        ) > 1e-7
    ) {
        throw new Error(
            "הסכום חייב להיות חיובי, עם עד שתי ספרות אחרי הנקודה"
        );
    }

    return Math.round(number * 100);
}

function balanceToCents(value) {
    return Math.round(Number(value) * 100);
}

function money(cents) {
    return (cents / 100).toFixed(2);
}

function validateNote(value) {
    const note = String(value || "").trim();

    if (!note) {
        throw new Error("יש להזין סיבה לפעולה");
    }

    if (note.length > 400) {
        throw new Error("ההערה ארוכה מדי");
    }

    return note;
}

// ---------------------------------------------
// Create or lock an existing wallet
// ---------------------------------------------
async function lockWallet(connection, clientId) {
    await connection.execute(
        `INSERT IGNORE INTO wallets (
            client_id,
            credit_balance
        ) VALUES (?, 0.00)`,
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
        throw new Error("Wallet not found");
    }

    return balanceToCents(wallet.credit_balance);
}

// ---------------------------------------------
// 1. Get wallet balance and activity
// ---------------------------------------------
async function getWalletByClientId(clientId) {
    try {
        const id = validClientId(clientId);

        const [clients] = await pool.execute(
            `SELECT client_id
             FROM clients
             WHERE client_id = ?`,
            [id]
        );

        if (!clients.length) {
            throw new Error("Client not found");
        }

        const [walletRows] = await pool.execute(
            `SELECT credit_balance
             FROM wallets
             WHERE client_id = ?`,
            [id]
        );

        const balance = walletRows.length
            ? walletRows[0].credit_balance
            : "0.00";

        // Wallet-related payments and adjustments.
        // Direct overpayments are also wallet credits.
        const [payments] = await pool.execute(
            `SELECT
                payment_id,
                payment_date,
                payment_source,
                target_type,
                treatment_id,
                purchase_id,
                amount_received,
                amount_applied,
                note
             FROM payments
             WHERE client_id = ?
               AND (
                   payment_source = 'WALLET'
                   OR target_type = 'WALLET_CREDIT'
                   OR (
                       payment_source = 'DIRECT'
                       AND amount_received > amount_applied
                   )
               )
             ORDER BY payment_date DESC, payment_id DESC
             LIMIT 50`,
            [id]
        );

        return {
            success: true,
            client_id: id,
            credit_balance: balance,
            payments
        };

    } catch (error) {
        console.error("Error loading wallet:", error);

        return {
            success: false,
            message: error.message
        };
    }
}

// ---------------------------------------------
// 2. Manual wallet adjustment
// ---------------------------------------------
// action: CREDIT or DEBIT
//
// CREDIT = add money to wallet
// DEBIT  = remove money from wallet
//
// No treatment or purchase is created.
async function adjustWallet(clientId, body) {
    const connection = await pool.getConnection();

    try {
        const id = validClientId(clientId);

        const action = String(
            body?.action || ""
        ).toUpperCase();

        if (!["CREDIT", "DEBIT"].includes(action)) {
            throw new Error("פעולת ארנק לא תקינה");
        }

        const amount = toCents(body?.amount);
        const note = validateNote(body?.note);

        await connection.beginTransaction();

        const balance = await lockWallet(
            connection,
            id
        );

        if (action === "DEBIT" && amount > balance) {
            throw new Error(
                "לא ניתן להפחית יותר מהיתרה בארנק"
            );
        }

        const newBalance = action === "CREDIT"
            ? balance + amount
            : balance - amount;

        // Prevent values outside DECIMAL(10,2).
        if (newBalance > 9999999999) {
            throw new Error("יתרת הארנק חורגת מהטווח המותר");
        }

        // Preserve an audit record in the existing
        // payments table without changing the schema.
        //
        // CREDIT: new money received into wallet.
        // DEBIT: manual reduction of existing wallet funds.
        //
        // The note prefix differentiates adjustments
        // from ordinary treatment/purchase payments.
        if (action === "CREDIT") {
            await connection.execute(
                `INSERT INTO payments (
                    client_id,
                    payment_source,
                    target_type,
                    amount_received,
                    amount_applied,
                    note
                ) VALUES (
                    ?, 'DIRECT', 'WALLET_CREDIT',
                    ?, 0, ?
                )`,
                [
                    id,
                    money(amount),
                    `MANUAL_WALLET_CREDIT: ${note}`
                ]
            );
        } else {
            await connection.execute(
                `INSERT INTO payments (
                    client_id,
                    payment_source,
                    target_type,
                    amount_received,
                    amount_applied,
                    note
                ) VALUES (
                    ?, 'WALLET', 'WALLET_CREDIT',
                    0, ?, ?
                )`,
                [
                    id,
                    money(amount),
                    `MANUAL_WALLET_DEBIT: ${note}`
                ]
            );
        }

        await connection.execute(
            `UPDATE wallets
             SET credit_balance = ?
             WHERE client_id = ?`,
            [
                money(newBalance),
                id
            ]
        );

        await connection.commit();

        return {
            success: true,
            message: action === "CREDIT"
                ? "הכסף נוסף לארנק בהצלחה"
                : "הסכום הופחת מהארנק בהצלחה",
            action,
            amount: money(amount),
            previous_balance: money(balance),
            credit_balance: money(newBalance)
        };

    } catch (error) {
        await connection.rollback();

        console.error(
            "Error adjusting wallet:",
            error
        );

        return {
            success: false,
            message: error.message
        };

    } finally {
        connection.release();
    }
}

module.exports = {
    getWalletByClientId,
    adjustWallet
};
