
const express = require("express");
const axios = require("axios");

const clientsController = require("../controllers/clientsController");
const pool = require("../DB");
const authorizeAdmin = require("../middleware/authorizeAdmin");

const router = express.Router();

const AI_SERVICE_URL = "http://127.0.0.1:8000";

// -----------------------------------------
// Helpers
// -----------------------------------------

function parseClientId(value) {
    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0
        ? id
        : null;
}

function sendError(res, error, message) {
    console.error(message, error);

    return res.status(500).json({
        status: "error",
        message
    });
}

function invalidClient(res) {
    return res.status(400).json({
        status: "error",
        message: "Invalid client ID"
    });
}

async function getClientTreatments(clientId) {
    const [rows] = await pool.query(
        `
        SELECT
            t.treatment_id,
            t.treatment_type_id,
            tt.treatment_name AS treatment_type,
            tt.treatment_name,
            t.treatment_date,
            t.duration,
            t.summary,
            t.treatment_price AS amount,
            t.treatment_price,
            t.amount_paid,
            GREATEST(
                t.treatment_price - t.amount_paid,
                0
            ) AS debt,
            CASE
                WHEN t.amount_paid >= t.treatment_price
                    THEN 'Paid'
                WHEN t.amount_paid > 0
                    THEN 'Partially Paid'
                ELSE 'Unpaid'
            END AS status,
            t.is_special_price,
            t.price_note
        FROM treatments t
        JOIN treatment_types tt
            ON tt.treatment_type_id = t.treatment_type_id
        WHERE t.client_id = ?
        ORDER BY t.treatment_date DESC, t.treatment_id DESC
        `,
        [clientId]
    );

    return rows;
}

async function getClientPurchases(clientId) {
    const [rows] = await pool.query(
        `
        SELECT
            p.purchase_id,
            p.product_id,
            pr.product_name,
            p.purchase_date,
            p.purchase_price,
            p.amount_paid,
            GREATEST(
                p.purchase_price - p.amount_paid,
                0
            ) AS debt,
            CASE
                WHEN p.amount_paid >= p.purchase_price
                    THEN 'Paid'
                WHEN p.amount_paid > 0
                    THEN 'Partially Paid'
                ELSE 'Unpaid'
            END AS status
        FROM purchases p
        JOIN products pr
            ON pr.product_id = p.product_id
        WHERE p.client_id = ?
        ORDER BY p.purchase_date DESC, p.purchase_id DESC
        `,
        [clientId]
    );

    return rows;
}

async function getClientRecommendations(clientId) {
    const [rows] = await pool.query(
        `
        SELECT
            r.recommendation_id,
            r.product_id,
            p.product_name,
            r.created_at
        FROM recommendations r
        JOIN products p
            ON p.product_id = r.product_id
        WHERE r.client_id = ?
        ORDER BY r.created_at DESC
        `,
        [clientId]
    );

    return rows;
}

async function getClientWallet(clientId) {
    const [[wallet]] = await pool.query(
        `
        SELECT credit_balance
        FROM wallets
        WHERE client_id = ?
        `,
        [clientId]
    );

    return Number(wallet?.credit_balance ?? 0);
}

// =========================================
// AI CHAT AGENT
// =========================================

router.post("/agent", authorizeAdmin, async (req, res) => {
    try {
        const question =
            typeof req.body?.question === "string"
                ? req.body.question.trim()
                : "";

        const conversationId = req.body?.conversation_id;
        const adminId = req.user.user_id;

        if (!question) {
            return res.status(400).json({
                status: "error",
                message: "Question is required"
            });
        }

        if (!conversationId) {
            return res.status(400).json({
                status: "error",
                message: "Conversation ID is required"
            });
        }

        const [existingConversation] = await pool.query(
            `
            SELECT conversation_id, admin_id
            FROM ai_conversations
            WHERE conversation_id = ?
            `,
            [conversationId]
        );

        if (existingConversation.length === 0) {
            const title =
                question.length > 60
                    ? question.substring(0, 60) + "..."
                    : question;

            await pool.query(
                `
                INSERT INTO ai_conversations
                    (conversation_id, admin_id, title)
                VALUES (?, ?, ?)
                `,
                [conversationId, adminId, title]
            );
        } else if (
            Number(existingConversation[0].admin_id) !==
            Number(adminId)
        ) {
            return res.status(403).json({
                status: "error",
                message: "You do not have access to this conversation"
            });
        }

        const [historyRows] = await pool.query(
            `
            SELECT role, message_text
            FROM ai_messages
            WHERE conversation_id = ?
            ORDER BY message_id ASC
            `,
            [conversationId]
        );

        const history = historyRows.map((message) => ({
            role: message.role,
            text: message.message_text
        }));

        await pool.query(
            `
            INSERT INTO ai_messages
                (conversation_id, role, message_text)
            VALUES (?, 'user', ?)
            `,
            [conversationId, question]
        );

        const response = await axios.post(
            `${AI_SERVICE_URL}/agent`,
            {
                question,
                conversation_id: conversationId,
                history
            },
            {
                timeout: 30000
            }
        );

        if (
            response.data?.status !== "ok" ||
            !response.data?.answer
        ) {
            throw new Error(
                response.data?.error ||
                "AI service returned an invalid response"
            );
        }

        const answer = response.data.answer;

        await pool.query(
            `
            INSERT INTO ai_messages
                (conversation_id, role, message_text)
            VALUES (?, 'assistant', ?)
            `,
            [conversationId, answer]
        );

        await pool.query(
            `
            UPDATE ai_conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE conversation_id = ?
            `,
            [conversationId]
        );

        return res.json({
            status: "ok",
            conversation_id: conversationId,
            answer
        });

    } catch (error) {
        console.error("AI Agent error:", error.message);

        if (error.response) {
            console.error(
                "AI Service response:",
                error.response.data
            );
        }

        return res.status(500).json({
            status: "error",
            message: "AI assistant is currently unavailable"
        });
    }
});

// =========================================
// AI SERVICE HEALTH
// =========================================

router.get("/health", async (req, res) => {
    try {
        const response = await axios.get(
            `${AI_SERVICE_URL}/health`,
            { timeout: 5000 }
        );

        return res.json({
            status: "ok",
            nodeServer: "connected",
            aiService: response.data
        });

    } catch (error) {
        return sendError(
            res,
            error,
            "Could not connect to AI service"
        );
    }
});

// =========================================
// CLIENT AI SUMMARY
// =========================================

router.get(
    "/client-summary/:id",
    authorizeAdmin,
    async (req, res) => {
        try {
            const clientId = parseClientId(req.params.id);

            if (!clientId) {
                return invalidClient(res);
            }

            const clientResult =
                await clientsController.getClient(clientId);

            if (
                !clientResult.success ||
                !clientResult.clients?.length
            ) {
                return res.status(404).json({
                    status: "error",
                    message: "Client not found"
                });
            }

            const client = clientResult.clients[0];

            const clientData = {
                client_id: client.user_id,
                username: client.username,
                first_name: client.first_name,
                last_name: client.last_name,
                email: client.email,
                phone: client.phone,
                birth_date: client.birth_date,
                treatment_status: client.treatment_status,
                skin_type: client.skin_type,
                is_verified: Boolean(client.is_verified)
            };

            const [
                treatments,
                purchases,
                recommendations
            ] = await Promise.all([
                getClientTreatments(clientId),
                getClientPurchases(clientId),
                getClientRecommendations(clientId)
            ]);

            // Keep the existing Python payload structure.
            const contextPayload = {
                client: clientData,
                treatments,
                purchases,
                recommendations
            };

            const aiResponse = await axios.post(
                `${AI_SERVICE_URL}/client-ai-summary`,
                contextPayload,
                { timeout: 30000 }
            );

            return res.json({
                status: "ok",
                contextPayload,
                aiServiceResponse: aiResponse.data
            });

        } catch (error) {
            return sendError(
                res,
                error,
                "Failed to create client summary"
            );
        }
    }
);

// =========================================
// AI TOOL: CLIENT DETAILS
// =========================================

router.get("/tools/client/:id", async (req, res) => {
    try {
        const clientId = parseClientId(req.params.id);

        if (!clientId) {
            return invalidClient(res);
        }

        const result =
            await clientsController.getClient(clientId);

        if (!result.success || !result.clients?.length) {
            return res.status(404).json({
                status: "error",
                message: "Client not found"
            });
        }

        const client = result.clients[0];

        return res.json({
            client_id: client.user_id,
            first_name: client.first_name,
            last_name: client.last_name,
            skin_type: client.skin_type,
            treatment_status: client.treatment_status
        });

    } catch (error) {
        return sendError(
            res,
            error,
            "Failed to retrieve client"
        );
    }
});

// =========================================
// AI TOOL: SEARCH CLIENT
// =========================================

router.get("/tools/clients/search", async (req, res) => {
    try {
        const name =
            typeof req.query.name === "string"
                ? req.query.name.trim()
                : "";

        if (!name) {
            return res.status(400).json({
                status: "error",
                message: "Client name is required"
            });
        }

        const searchTerm = `%${name}%`;

        const [clients] = await pool.query(
            `
            SELECT
                u.user_id AS client_id,
                u.first_name,
                u.last_name,
                c.skin_type,
                c.treatment_status
            FROM users u
            JOIN clients c
                ON u.user_id = c.client_id
            WHERE u.role_id = 2
              AND (
                  u.first_name LIKE ?
                  OR u.last_name LIKE ?
                  OR CONCAT(
                      u.first_name, ' ', u.last_name
                  ) LIKE ?
              )
            ORDER BY u.first_name, u.last_name
            LIMIT 10
            `,
            [searchTerm, searchTerm, searchTerm]
        );

        return res.json({ clients });

    } catch (error) {
        return sendError(
            res,
            error,
            "Failed to search clients"
        );
    }
});

// =========================================
// AI TOOL: CLIENT TREATMENTS
// =========================================

router.get("/tools/client/:id/treatments", async (req, res) => {
    try {
        const clientId = parseClientId(req.params.id);

        if (!clientId) {
            return invalidClient(res);
        }

        const treatments =
            await getClientTreatments(clientId);

        return res.json({
            client_id: clientId,
            treatments
        });

    } catch (error) {
        return sendError(
            res,
            error,
            "Failed to retrieve treatments"
        );
    }
});

// =========================================
// AI TOOL: CLIENT PURCHASES
// =========================================

router.get("/tools/client/:id/purchases", async (req, res) => {
    try {
        const clientId = parseClientId(req.params.id);

        if (!clientId) {
            return invalidClient(res);
        }

        const purchases =
            await getClientPurchases(clientId);

        return res.json({
            client_id: clientId,
            purchases
        });

    } catch (error) {
        return sendError(
            res,
            error,
            "Failed to retrieve purchases"
        );
    }
});

// =========================================
// AI TOOL: CLIENT RECOMMENDATIONS
// =========================================

router.get(
    "/tools/client/:id/recommendations",
    async (req, res) => {
        try {
            const clientId = parseClientId(req.params.id);

            if (!clientId) {
                return invalidClient(res);
            }

            const recommendations =
                await getClientRecommendations(clientId);

            return res.json({
                client_id: clientId,
                recommendations
            });

        } catch (error) {
            return sendError(
                res,
                error,
                "Failed to retrieve recommendations"
            );
        }
    }
);

// =========================================
// GET ADMIN AI CONVERSATIONS
// =========================================

router.get(
    "/conversations",
    authorizeAdmin,
    async (req, res) => {
        try {
            const adminId = req.user.user_id;

            const [conversations] = await pool.query(
                `
                SELECT
                    conversation_id,
                    title,
                    created_at,
                    updated_at
                FROM ai_conversations
                WHERE admin_id = ?
                ORDER BY updated_at DESC
                `,
                [adminId]
            );

            return res.json({
                status: "ok",
                conversations
            });

        } catch (error) {
            return sendError(
                res,
                error,
                "Failed to retrieve conversations"
            );
        }
    }
);

// =========================================
// GET CONVERSATION MESSAGES
// =========================================

router.get(
    "/conversations/:conversationId/messages",
    authorizeAdmin,
    async (req, res) => {
        try {
            const adminId = req.user.user_id;
            const conversationId = req.params.conversationId;

            const [conversations] = await pool.query(
                `
                SELECT conversation_id
                FROM ai_conversations
                WHERE conversation_id = ?
                  AND admin_id = ?
                `,
                [conversationId, adminId]
            );

            if (!conversations.length) {
                return res.status(404).json({
                    status: "error",
                    message: "Conversation not found"
                });
            }

            const [messages] = await pool.query(
                `
                SELECT
                    message_id,
                    role,
                    message_text,
                    created_at
                FROM ai_messages
                WHERE conversation_id = ?
                ORDER BY message_id ASC
                `,
                [conversationId]
            );

            return res.json({
                status: "ok",
                messages
            });

        } catch (error) {
            return sendError(
                res,
                error,
                "Failed to retrieve messages"
            );
        }
    }
);

// =========================================
// DELETE CONVERSATION
// =========================================

router.delete(
    "/conversations/:conversationId",
    authorizeAdmin,
    async (req, res) => {
        try {
            const adminId = req.user.user_id;
            const conversationId = req.params.conversationId;

            const [result] = await pool.query(
                `
                DELETE FROM ai_conversations
                WHERE conversation_id = ?
                  AND admin_id = ?
                `,
                [conversationId, adminId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    status: "error",
                    message: "Conversation not found"
                });
            }

            return res.json({ status: "ok" });

        } catch (error) {
            return sendError(
                res,
                error,
                "Failed to delete conversation"
            );
        }
    }
);

// =========================================
// AI TOOL: CLINIC OVERVIEW
// =========================================

router.get("/tools/clinic/overview", async (req, res) => {
    try {
        const [[clientCount]] = await pool.query(
            `
            SELECT COUNT(*) AS total_clients
            FROM clients
            `
        );

        const [[unpaidTreatments]] = await pool.query(
            `
            SELECT
                COUNT(*) AS unpaid_treatments_count,
                COALESCE(
                    SUM(
                        GREATEST(
                            treatment_price - amount_paid,
                            0
                        )
                    ),
                    0
                ) AS unpaid_treatments_total
            FROM treatments
            WHERE treatment_price > amount_paid
            `
        );

        const [[unpaidPurchases]] = await pool.query(
            `
            SELECT
                COUNT(*) AS unpaid_purchases_count,
                COALESCE(
                    SUM(
                        GREATEST(
                            purchase_price - amount_paid,
                            0
                        )
                    ),
                    0
                ) AS unpaid_purchases_total
            FROM purchases
            WHERE purchase_price > amount_paid
            `
        );

        return res.json({
            total_clients: Number(
                clientCount.total_clients
            ),

            unpaid_treatments: {
                count: Number(
                    unpaidTreatments.unpaid_treatments_count
                ),
                total: Number(
                    unpaidTreatments.unpaid_treatments_total
                )
            },

            unpaid_purchases: {
                count: Number(
                    unpaidPurchases.unpaid_purchases_count
                ),
                total: Number(
                    unpaidPurchases.unpaid_purchases_total
                )
            }
        });

    } catch (error) {
        return sendError(
            res,
            error,
            "Failed to retrieve clinic overview"
        );
    }
});

// =========================================
// AI TOOL: CLIENT BIRTHDAYS
// =========================================

router.get(
    "/tools/clients/birthdays",
    async (req, res) => {
        try {
            const month = req.query.month
                ? Number(req.query.month)
                : new Date().getMonth() + 1;

            if (
                !Number.isInteger(month) ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid month"
                });
            }

            const [clients] = await pool.query(
                `
                SELECT
                    u.user_id AS client_id,
                    u.first_name,
                    u.last_name,
                    u.birth_date
                FROM users u
                JOIN clients c
                    ON c.client_id = u.user_id
                WHERE MONTH(u.birth_date) = ?
                ORDER BY DAY(u.birth_date)
                `,
                [month]
            );

            return res.json({
                month,
                clients
            });

        } catch (error) {
            return sendError(
                res,
                error,
                "Failed to retrieve birthdays"
            );
        }
    }
);

// =========================================
// AI TOOL: UNPAID PRODUCT PURCHASES
// =========================================

router.get(
    "/tools/finance/unpaid-products",
    async (req, res) => {
        try {
            const [items] = await pool.query(
                `
                SELECT
                    p.purchase_id,
                    u.user_id AS client_id,
                    u.first_name,
                    u.last_name,
                    pr.product_name,
                    p.purchase_price,
                    p.amount_paid,
                    GREATEST(
                        p.purchase_price - p.amount_paid,
                        0
                    ) AS debt,
                    p.purchase_date
                FROM purchases p
                JOIN users u
                    ON u.user_id = p.client_id
                JOIN products pr
                    ON pr.product_id = p.product_id
                WHERE p.purchase_price > p.amount_paid
                ORDER BY p.purchase_date DESC
                `
            );

            const total = items.reduce(
                (sum, item) =>
                    sum + Number(item.debt),
                0
            );

            return res.json({
                count: items.length,
                total,
                items
            });

        } catch (error) {
            return sendError(
                res,
                error,
                "Failed to retrieve unpaid purchases"
            );
        }
    }
);

// =========================================
// AI TOOL: CLIENT WALLET
// =========================================

router.get("/tools/client/:id/wallet", async (req, res) => {
    try {
        const clientId = parseClientId(req.params.id);

        if (!clientId) {
            return invalidClient(res);
        }

        const [[client]] = await pool.query(
            `
            SELECT client_id
            FROM clients
            WHERE client_id = ?
            `,
            [clientId]
        );

        if (!client) {
            return res.status(404).json({
                status: "error",
                message: "Client not found"
            });
        }

        const creditBalance =
            await getClientWallet(clientId);

        const [movements] = await pool.query(
            `
            SELECT
                payment_id,
                payment_date,
                payment_source,
                target_type,
                treatment_id,
                purchase_id,
                amount_received,
                amount_applied,
                note,
                CASE
                    WHEN note LIKE
                        'MANUAL_WALLET_CREDIT:%'
                        THEN 'MANUAL_CREDIT'

                    WHEN note LIKE
                        'MANUAL_WALLET_DEBIT:%'
                        THEN 'MANUAL_DEBIT'

                    WHEN payment_source = 'WALLET'
                        THEN 'WALLET_PAYMENT'

                    WHEN target_type = 'WALLET_CREDIT'
                        THEN 'WALLET_CREDIT'

                    WHEN payment_source = 'DIRECT'
                         AND amount_received > amount_applied
                        THEN 'OVERPAYMENT'

                    ELSE 'OTHER'
                END AS movement_type
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
            LIMIT 50
            `,
            [clientId]
        );

        return res.json({
            client_id: clientId,
            credit_balance: creditBalance,
            movements
        });

    } catch (error) {
        return sendError(
            res,
            error,
            "Failed to retrieve wallet data"
        );
    }
});

// =========================================
// AI TOOL: CLIENT FINANCIAL SUMMARY
// =========================================

router.get(
    "/tools/client/:id/financial-summary",
    async (req, res) => {
        try {
            const clientId = parseClientId(req.params.id);

            if (!clientId) {
                return invalidClient(res);
            }

            const [[treatments]] = await pool.query(
                `
                SELECT
                    COALESCE(
                        SUM(amount_paid), 0
                    ) AS paid_total,

                    COALESCE(
                        SUM(
                            GREATEST(
                                treatment_price - amount_paid,
                                0
                            )
                        ),
                        0
                    ) AS unpaid_total
                FROM treatments
                WHERE client_id = ?
                `,
                [clientId]
            );

            const [[purchases]] = await pool.query(
                `
                SELECT
                    COALESCE(
                        SUM(amount_paid), 0
                    ) AS paid_total,

                    COALESCE(
                        SUM(
                            GREATEST(
                                purchase_price - amount_paid,
                                0
                            )
                        ),
                        0
                    ) AS unpaid_total
                FROM purchases
                WHERE client_id = ?
                `,
                [clientId]
            );

            const walletBalance =
                await getClientWallet(clientId);

            const treatmentRevenue =
                Number(treatments.paid_total);

            const productRevenue =
                Number(purchases.paid_total);

            const treatmentDebt =
                Number(treatments.unpaid_total);

            const purchaseDebt =
                Number(purchases.unpaid_total);

            return res.json({
                client_id: clientId,
                wallet_balance: walletBalance,

                paid: {
                    treatments: treatmentRevenue,
                    products: productRevenue,
                    total:
                        treatmentRevenue + productRevenue
                },

                unpaid: {
                    treatments: treatmentDebt,
                    products: purchaseDebt,
                    total:
                        treatmentDebt + purchaseDebt
                }
            });

        } catch (error) {
            return sendError(
                res,
                error,
                "Failed to retrieve financial summary"
            );
        }
    }
);

// =========================================
// AI TOOL: CLIENT CONTACT
// =========================================

router.get("/tools/client/:id/contact", async (req, res) => {
    try {
        const clientId = parseClientId(req.params.id);

        if (!clientId) {
            return invalidClient(res);
        }

        const [clients] = await pool.query(
            `
            SELECT
                u.user_id AS client_id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.birth_date,
                TIMESTAMPDIFF(
                    YEAR,
                    u.birth_date,
                    CURDATE()
                ) AS age
            FROM users u
            JOIN clients c
                ON c.client_id = u.user_id
            WHERE u.user_id = ?
            `,
            [clientId]
        );

        if (!clients.length) {
            return res.status(404).json({
                status: "error",
                message: "Client not found"
            });
        }

        return res.json(clients[0]);

    } catch (error) {
        return sendError(
            res,
            error,
            "Failed to retrieve contact information"
        );
    }
});

// =========================================
// EXPORT
// =========================================

module.exports = router;
