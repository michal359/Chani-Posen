
const pool = require('../DB.js');

// Work with cents to prevent rounding errors.
function cents(value, name = 'amount') {
    const number = Number(value);

    if (
        value === null ||
        value === '' ||
        !Number.isFinite(number) ||
        number < 0 ||
        Math.abs(number * 100 - Math.round(number * 100)) > 1e-7
    ) {
        throw new Error(`Invalid ${name}`);
    }

    return Math.round(number * 100);
}

function money(value) {
    return (value / 100).toFixed(2);
}

function positiveId(value, name) {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error(`Invalid ${name}`);
    }

    return id;
}

async function transaction(callback) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const result = await callback(connection);

        await connection.commit();
        return result;

    } catch (err) {
        await connection.rollback();
        throw err;

    } finally {
        connection.release();
    }
}

function failure(err, operation) {
    console.error(`Error ${operation}:`, err);

    return {
        success: false,
        message: err.message
    };
}

// Ensure the client has a wallet and lock it.
async function lockWallet(connection, clientId) {
    await connection.execute(
        `INSERT IGNORE INTO wallets
         (client_id, credit_balance)
         VALUES (?, 0)`,
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
        throw new Error('Client wallet not found');
    }

    return cents(wallet.credit_balance);
}

// Apply a NEW payment to a purchase.
//
// directAmount: new money received from client.
// walletAmount: money taken from existing wallet.
//
// Direct overpayment is credited to the wallet.
// Wallet usage cannot exceed the purchase debt.
async function applyPayment(
    connection,
    purchase,
    directAmount,
    walletAmount
) {
    const direct = cents(directAmount, 'directAmount');
    const fromWallet = cents(walletAmount, 'walletAmount');

    const price = cents(purchase.purchase_price);
    const alreadyPaid = cents(purchase.amount_paid);

    const debt = price - alreadyPaid;

    if (debt < 0) {
        throw new Error(
            'Purchase already contains an invalid overpayment'
        );
    }

    if (direct === 0 && fromWallet === 0) {
        return {
            amountPaid: money(alreadyPaid),
            remainingDebt: money(debt),
            walletBalance: null,
            excessToWallet: '0.00'
        };
    }

    const clientId = purchase.client_id;
    const purchaseId = purchase.purchase_id;

    const walletBalance = await lockWallet(
        connection,
        clientId
    );

    if (fromWallet > walletBalance) {
        throw new Error('Insufficient wallet balance');
    }

    if (fromWallet > debt) {
        throw new Error(
            'Wallet payment cannot exceed remaining debt'
        );
    }

    const directApplied = Math.min(
        direct,
        debt - fromWallet
    );

    const excess = direct - directApplied;

    const newPaid =
        alreadyPaid + fromWallet + directApplied;

    const newWalletBalance =
        walletBalance - fromWallet + excess;

    // Register the external payment.
    // amount_received includes the full amount received.
    // amount_applied includes only the amount used
    // to pay for this purchase.
    if (direct > 0) {
        await connection.execute(
            `INSERT INTO payments (
                client_id,
                payment_source,
                target_type,
                purchase_id,
                amount_received,
                amount_applied,
                note
            ) VALUES (
                ?, 'DIRECT', 'PURCHASE', ?, ?, ?, ?
            )`,
            [
                clientId,
                purchaseId,
                money(direct),
                money(directApplied),
                excess > 0
                    ? `Overpayment of ${money(excess)} credited to wallet`
                    : 'Direct purchase payment'
            ]
        );
    }

    // Wallet money has already been received previously.
    // Do not count it as newly received money.
    if (fromWallet > 0) {
        await connection.execute(
            `INSERT INTO payments (
                client_id,
                payment_source,
                target_type,
                purchase_id,
                amount_received,
                amount_applied,
                note
            ) VALUES (
                ?, 'WALLET', 'PURCHASE', ?, 0, ?, ?
            )`,
            [
                clientId,
                purchaseId,
                money(fromWallet),
                'Purchase payment from wallet'
            ]
        );
    }

    await connection.execute(
        `UPDATE purchases
         SET amount_paid = ?
         WHERE purchase_id = ?`,
        [money(newPaid), purchaseId]
    );

    await connection.execute(
        `UPDATE wallets
         SET credit_balance = ?
         WHERE client_id = ?`,
        [money(newWalletBalance), clientId]
    );

    return {
        amountPaid: money(newPaid),
        remainingDebt: money(price - newPaid),
        walletBalance: money(newWalletBalance),
        excessToWallet: money(excess)
    };
}

// ----------------------------------------------------
// 1. Get client purchases
// ----------------------------------------------------
async function getClientsPurchasesById(clientId) {
    try {
        const id = positiveId(clientId, 'clientId');

        const [rows] = await pool.execute(
            `SELECT
                pu.purchase_id,
                pu.client_id,
                pu.product_id,
                p.product_name,
                p.product_description,
                p.purchase_count,
                p.product_price AS current_product_price,
                pu.purchase_price,
                pu.purchase_price AS product_price,
                pu.amount_paid,
                pu.purchase_date,

                GREATEST(
                    pu.purchase_price - pu.amount_paid,
                    0
                ) AS remaining_debt,

                CASE
                    WHEN pu.amount_paid >= pu.purchase_price
                        THEN 'Paid'
                    WHEN pu.amount_paid > 0
                        THEN 'Partial'
                    ELSE 'Unpaid'
                END AS payment_status,

                CASE
                    WHEN pu.amount_paid >= pu.purchase_price
                        THEN 'Paid'
                    ELSE 'Unpaid'
                END AS status,

                (
                    SELECT MIN(i.image_path)
                    FROM images i
                    WHERE i.product_id = p.product_id
                      AND i.image_type = 'product'
                ) AS image_path

             FROM purchases pu
             JOIN products p
                ON p.product_id = pu.product_id

             WHERE pu.client_id = ?
             ORDER BY pu.purchase_date DESC,
                      pu.purchase_id DESC`,
            [id]
        );

        return {
            success: true,
            message: 'Successfully retrieved purchases',
            purchases: rows
        };

    } catch (err) {
        return failure(err, 'getting purchases');
    }
}

// ----------------------------------------------------
// 2. Add purchase
// ----------------------------------------------------
async function addPurchase(body) {
    try {
        const result = await transaction(async (conn) => {
            const clientId = positiveId(
                body.clientId ?? body.client_id,
                'clientId'
            );

            const productId = positiveId(
                body.productId ?? body.product_id,
                'productId'
            );

            const [[product]] = await conn.execute(
                `SELECT product_price
                 FROM products
                 WHERE product_id = ?`,
                [productId]
            );

            if (!product) {
                throw new Error('Product not found');
            }

            const regularPrice = cents(
                product.product_price
            );

            const requestedPrice =
                body.purchasePrice ??
                body.purchase_price;

            const price =
                requestedPrice !== undefined
                    ? cents(requestedPrice, 'purchasePrice')
                    : regularPrice;

            const [insert] = await conn.execute(
                `INSERT INTO purchases (
                    client_id,
                    product_id,
                    purchase_price,
                    amount_paid
                ) VALUES (?, ?, ?, 0)`,
                [clientId, productId, money(price)]
            );

            await conn.execute(
                `UPDATE products
                 SET purchase_count =
                     COALESCE(purchase_count, 0) + 1
                 WHERE product_id = ?`,
                [productId]
            );

            const purchase = {
                purchase_id: insert.insertId,
                client_id: clientId,
                purchase_price: money(price),
                amount_paid: '0.00'
            };

            // New API: directAmount and walletAmount.
            // Old UI: status = Paid / Unpaid.
            let directAmount =
                body.directAmount ??
                body.direct_amount ??
                0;

            const walletAmount =
                body.walletAmount ??
                body.wallet_amount ??
                0;

            const explicitPayment =
                body.directAmount !== undefined ||
                body.direct_amount !== undefined ||
                body.walletAmount !== undefined ||
                body.wallet_amount !== undefined;

            if (!explicitPayment) {
                if (body.status === 'Paid') {
                    directAmount = money(price);
                } else if (
                    body.status !== undefined &&
                    body.status !== 'Unpaid'
                ) {
                    throw new Error('Invalid purchase status');
                }
            }

            const payment = await applyPayment(
                conn,
                purchase,
                directAmount,
                walletAmount
            );

            return {
                success: true,
                message: 'Purchase added successfully',
                purchaseId: insert.insertId,
                purchasePrice: money(price),
                isSpecialPrice: price !== regularPrice,
                ...payment
            };
        });

        return result;

    } catch (err) {
        return failure(err, 'adding purchase');
    }
}

// ----------------------------------------------------
// 3. Add a payment to an existing purchase
// ----------------------------------------------------
// Function name retained for existing controller.
async function updatePurchaseStatus(body, purchaseId) {
    try {
        return await transaction(async (conn) => {
            const id = positiveId(
                purchaseId,
                'purchaseId'
            );

            const [[purchase]] = await conn.execute(
                `SELECT *
                 FROM purchases
                 WHERE purchase_id = ?
                 FOR UPDATE`,
                [id]
            );

            if (!purchase) {
                throw new Error('Purchase not found');
            }

            let directAmount =
                body.directAmount ??
                body.direct_amount ??
                0;

            const walletAmount =
                body.walletAmount ??
                body.wallet_amount ??
                0;

            const explicitPayment =
                body.directAmount !== undefined ||
                body.direct_amount !== undefined ||
                body.walletAmount !== undefined ||
                body.wallet_amount !== undefined;

            // Temporary compatibility with old React UI.
            if (!explicitPayment) {
                const remaining =
                    cents(purchase.purchase_price) -
                    cents(purchase.amount_paid);

                if (body.status === 'Paid') {
                    directAmount = money(
                        Math.max(remaining, 0)
                    );
                } else if (body.status === 'Unpaid') {
                    if (cents(purchase.amount_paid) > 0) {
                        throw new Error(
                            'Recorded payments cannot be reversed by changing status'
                        );
                    }

                    directAmount = 0;
                } else {
                    throw new Error(
                        'Provide directAmount or walletAmount'
                    );
                }
            }

            const payment = await applyPayment(
                conn,
                purchase,
                directAmount,
                walletAmount
            );

            return {
                success: true,
                message: 'Payment updated successfully',
                purchaseId: id,
                ...payment
            };
        });

    } catch (err) {
        return failure(err, 'updating purchase payment');
    }
}

// ----------------------------------------------------
// 4. Delete unpaid purchase only
// ----------------------------------------------------
async function deletePurchase(purchaseId) {
    try {
        return await transaction(async (conn) => {
            const id = positiveId(
                purchaseId,
                'purchaseId'
            );

            const [[purchase]] = await conn.execute(
                `SELECT *
                 FROM purchases
                 WHERE purchase_id = ?
                 FOR UPDATE`,
                [id]
            );

            if (!purchase) {
                throw new Error('Purchase not found');
            }

            if (cents(purchase.amount_paid) > 0) {
                throw new Error(
                    'Cannot delete a purchase that has been paid'
                );
            }

            const [[history]] = await conn.execute(
                `SELECT COUNT(*) AS total
                 FROM payments
                 WHERE purchase_id = ?`,
                [id]
            );

            if (Number(history.total) > 0) {
                throw new Error(
                    'Cannot delete a purchase with payment history'
                );
            }

            await conn.execute(
                `DELETE FROM purchases
                 WHERE purchase_id = ?`,
                [id]
            );

            await conn.execute(
                `UPDATE products
                 SET purchase_count = GREATEST(
                     COALESCE(purchase_count, 0) - 1,
                     0
                 )
                 WHERE product_id = ?`,
                [purchase.product_id]
            );

            return {
                success: true,
                message: 'Purchase deleted successfully'
            };
        });

    } catch (err) {
        return failure(err, 'deleting purchase');
    }
}

// ----------------------------------------------------
// 5. Deposit money into wallet independently
// ----------------------------------------------------
async function depositToWallet(body) {
    try {
        return await transaction(async (conn) => {
            const clientId = positiveId(
                body.clientId ?? body.client_id,
                'clientId'
            );

            const amount = cents(
                body.amount,
                'deposit amount'
            );

            if (amount <= 0) {
                throw new Error(
                    'Deposit amount must be greater than zero'
                );
            }

            const balance = await lockWallet(
                conn,
                clientId
            );

            const newBalance = balance + amount;

            await conn.execute(
                `INSERT INTO payments (
                    client_id,
                    payment_source,
                    target_type,
                    amount_received,
                    amount_applied,
                    note
                ) VALUES (
                    ?, 'DIRECT', 'WALLET_CREDIT', ?, 0, ?
                )`,
                [
                    clientId,
                    money(amount),
                    body.note || 'Independent wallet deposit'
                ]
            );

            await conn.execute(
                `UPDATE wallets
                 SET credit_balance = ?
                 WHERE client_id = ?`,
                [money(newBalance), clientId]
            );

            return {
                success: true,
                message: 'Wallet credited successfully',
                depositedAmount: money(amount),
                walletBalance: money(newBalance)
            };
        });

    } catch (err) {
        return failure(err, 'depositing into wallet');
    }
}

module.exports = {
    getClientsPurchasesById,
    deletePurchase,
    updatePurchaseStatus,
    addPurchase,
    depositToWallet
};
