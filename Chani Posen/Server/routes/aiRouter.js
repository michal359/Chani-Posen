const express = require("express");
const axios = require("axios");

const clientsController = require("../controllers/clientsController");
const pool = require("../DB");
const authorizeAdmin = require("../middleware/authorizeAdmin");

const router = express.Router();

// AI AGENT
// Receives a question from React and sends it to Python
// Only admins can use the AI assistant

router.post("/agent", authorizeAdmin, async (req, res) => {
    try {
        const question = req.body.question?.trim();
        const conversationId = req.body.conversation_id;

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

        // Check if conversation already exists

        const [existingConversation] = await pool.query(
            `
      SELECT conversation_id, admin_id
      FROM ai_conversations
      WHERE conversation_id = ?
      `,
            [conversationId]
        );

        // Conversation does not exist yet -> create it
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
                [
                    conversationId,
                    adminId,
                    title
                ]
            );

            console.log(
                `💾 Created conversation ${conversationId}`
            );
        }

        // Conversation exists, but belongs to another admin
        else if (
            existingConversation[0].admin_id !== adminId
        ) {
            return res.status(403).json({
                status: "error",
                message: "You do not have access to this conversation"
            });
        }

        // Load previous conversation history

        const [historyRows] = await pool.query(
            `
        SELECT
          role,
          message_text
        FROM ai_messages
        WHERE conversation_id = ?
        ORDER BY message_id ASC
        `,
            [conversationId]
        );

        const history = historyRows.map(message => ({
            role: message.role,
            text: message.message_text
        }));


        // Save user's message

        await pool.query(
            `
      INSERT INTO ai_messages
        (conversation_id, role, message_text)
      VALUES (?, 'user', ?)
      `,
            [
                conversationId,
                question
            ]
        );


        // Send question to Python Agent

        const response = await axios.post(
            "http://127.0.0.1:8000/agent",
            {
                question: question,
                conversation_id: conversationId,
                history: history
            },
            {
                timeout: 30000
            }
        );


        if (
            response.data.status !== "ok" ||
            !response.data.answer
        ) {
            throw new Error(
                response.data.error ||
                "AI service returned an invalid response"
            );
        }

        const answer = response.data.answer;


        // Save AI response

        await pool.query(
            `
      INSERT INTO ai_messages
        (conversation_id, role, message_text)
      VALUES (?, 'assistant', ?)
      `,
            [
                conversationId,
                answer
            ]
        );


        // Update conversation activity time

        await pool.query(
            `
      UPDATE ai_conversations
      SET updated_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ?
      `,
            [conversationId]
        );


        // Return response to React

        return res.json({
            status: "ok",
            conversation_id: conversationId,
            answer: answer
        });

    } catch (error) {

        console.error(
            "AI Agent error:",
            error.message
        );

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

router.get("/health", async (req, res) => {
    try {
        const response = await axios.get(
            "http://127.0.0.1:8000/health"
        );

        res.json({
            status: "ok",
            nodeServer: "connected",
            aiService: response.data
        });

    } catch (error) {
        console.error(
            "AI service connection error:",
            error.message
        );

        res.status(500).json({
            status: "error",
            message: "Could not connect to AI service"
        });
    }
});


// Client Context

router.get("/client-summary/:id", async (req, res) => {

    try {

        const clientId = Number(req.params.id);

        if (!Number.isInteger(clientId) || clientId <= 0) {
            return res.status(400).json({
                status: "error",
                message: "Invalid client ID"
            });
        }

        // client data 
        const clientResult =
            await clientsController.getClient(clientId);


        if (
            !clientResult.success ||
            !clientResult.clients ||
            clientResult.clients.length === 0
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


        // client treatment
        const [treatments] = await pool.query(
            `
      SELECT
        treatment_id,
        treatment_type,
        treatment_date,
        duration,
        summary,
        status,
        amount
      FROM treatments
      WHERE client_id = ?
      ORDER BY treatment_date DESC
      `,
            [clientId]
        );
        // client purchases
        const [purchases] = await pool.query(
            `
      SELECT
        p.purchase_id,
        p.product_id,
        pr.product_name,
        p.purchase_date,
        p.status
      FROM purchases p
      JOIN products pr
        ON p.product_id = pr.product_id
      WHERE p.client_id = ?
      ORDER BY p.purchase_date DESC
      `,
            [clientId]
        );


        // client recommendations
        const [recommendations] = await pool.query(
            `
      SELECT
        r.recommendation_id,
        r.product_id,
        p.product_name,
        r.created_at
      FROM recommendations r
      JOIN products p
        ON r.product_id = p.product_id
      WHERE r.client_id = ?
      ORDER BY r.created_at DESC
      `,
            [clientId]
        );


        const contextPayload = {

            client: clientData,

            treatments: treatments,

            purchases: purchases,

            recommendations: recommendations

        };

        const aiResponse = await axios.post(
            "http://127.0.0.1:8000/client-ai-summary",
            contextPayload
        );

        res.json({

            status: "ok",

            contextPayload: contextPayload,

            aiServiceResponse: aiResponse.data

        });


    } catch (error) {

        console.error(
            "Client summary error:",
            error.message
        );

        if (error.message === "clients not found") {

            return res.status(404).json({
                status: "error",
                message: "Client not found"
            });

        }

        if (error.response) {

            console.error(
                "AI Service response:",
                error.response.data
            );

        }


        res.status(500).json({
            status: "error",
            message: "Failed to create client summary"
        });

    }

});

// AI TOOL: Get client basic information

router.get("/tools/client/:id", async (req, res) => {
    try {
        const clientId = Number(req.params.id);

        if (!Number.isInteger(clientId) || clientId <= 0) {
            return res.status(400).json({
                status: "error",
                message: "Invalid client ID"
            });
        }

        const clientResult = await clientsController.getClient(clientId);

        if (
            !clientResult.success ||
            !clientResult.clients ||
            clientResult.clients.length === 0
        ) {
            return res.status(404).json({
                status: "error",
                message: "Client not found"
            });
        }

        const client = clientResult.clients[0];

        res.json({
            client_id: client.user_id,
            first_name: client.first_name,
            last_name: client.last_name,
            skin_type: client.skin_type,
            treatment_status: client.treatment_status
        });

    } catch (error) {
        console.error("AI get_client tool error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Failed to retrieve client"
        });
    }
});


// AI TOOL: Search client by name

router.get("/tools/clients/search", async (req, res) => {
    try {
        const name = req.query.name?.trim();

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
          OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?
        )
      ORDER BY u.first_name, u.last_name
      LIMIT 10
      `,
            [searchTerm, searchTerm, searchTerm]
        );

        return res.json({
            clients
        });

    } catch (error) {
        console.error("AI search_client tool error:", error.message);

        return res.status(500).json({
            status: "error",
            message: "Failed to search clients"
        });
    }
});

// AI TOOL: Get client treatments

router.get("/tools/client/:id/treatments", async (req, res) => {
    try {
        const clientId = Number(req.params.id);

        if (!Number.isInteger(clientId) || clientId <= 0) {
            return res.status(400).json({
                status: "error",
                message: "Invalid client ID"
            });
        }

        const [treatments] = await pool.query(
            `
      SELECT
        treatment_id,
        treatment_type,
        treatment_date,
        duration,
        summary,
        status,
        amount
      FROM treatments
      WHERE client_id = ?
      ORDER BY treatment_date DESC
      `,
            [clientId]
        );

        return res.json({
            client_id: clientId,
            treatments: treatments
        });

    } catch (error) {
        console.error("AI get_treatments tool error:", error.message);

        return res.status(500).json({
            status: "error",
            message: "Failed to retrieve treatments"
        });
    }
});

// AI TOOL: Get client purchases

router.get("/tools/client/:id/purchases", async (req, res) => {
    try {
        const clientId = Number(req.params.id);

        if (!Number.isInteger(clientId) || clientId <= 0) {
            return res.status(400).json({
                status: "error",
                message: "Invalid client ID"
            });
        }

        const [purchases] = await pool.query(
            `
      SELECT
        p.purchase_id,
        p.product_id,
        pr.product_name,
        p.purchase_date,
        p.status
      FROM purchases p
      JOIN products pr
        ON p.product_id = pr.product_id
      WHERE p.client_id = ?
      ORDER BY p.purchase_date DESC
      `,
            [clientId]
        );

        return res.json({
            client_id: clientId,
            purchases
        });

    } catch (error) {
        console.error("AI get_purchases tool error:", error.message);

        return res.status(500).json({
            status: "error",
            message: "Failed to retrieve purchases"
        });
    }
});


// AI TOOL: Get client recommendations

router.get("/tools/client/:id/recommendations", async (req, res) => {
    try {
        const clientId = Number(req.params.id);

        if (!Number.isInteger(clientId) || clientId <= 0) {
            return res.status(400).json({
                status: "error",
                message: "Invalid client ID"
            });
        }

        const [recommendations] = await pool.query(
            `
      SELECT
        r.recommendation_id,
        r.product_id,
        p.product_name,
        r.created_at
      FROM recommendations r
      JOIN products p
        ON r.product_id = p.product_id
      WHERE r.client_id = ?
      ORDER BY r.created_at DESC
      `,
            [clientId]
        );

        return res.json({
            client_id: clientId,
            recommendations
        });

    } catch (error) {
        console.error(
            "AI get_recommendations tool error:",
            error.message
        );

        return res.status(500).json({
            status: "error",
            message: "Failed to retrieve recommendations"
        });
    }
});

// GET ALL AI CONVERSATIONS FOR CURRENT ADMIN

router.get("/conversations", authorizeAdmin, async (req, res) => {
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
        console.error(
            "Get AI conversations error:",
            error.message
        );

        return res.status(500).json({
            status: "error",
            message: "Failed to retrieve conversations"
        });
    }
});

// GET MESSAGES OF ONE CONVERSATION

router.get(
    "/conversations/:conversationId/messages",
    authorizeAdmin,
    async (req, res) => {
        try {
            const adminId = req.user.user_id;
            const conversationId = req.params.conversationId;

            const [conversation] = await pool.query(
                `
        SELECT conversation_id
        FROM ai_conversations
        WHERE conversation_id = ?
          AND admin_id = ?
        `,
                [conversationId, adminId]
            );

            if (conversation.length === 0) {
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
            console.error(
                "Get AI messages error:",
                error.message
            );

            return res.status(500).json({
                status: "error",
                message: "Failed to retrieve messages"
            });
        }
    }
);

// DELETE CONVERSATION

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

            return res.json({
                status: "ok"
            });

        } catch (error) {
            console.error(
                "Delete AI conversation error:",
                error.message
            );

            return res.status(500).json({
                status: "error",
                message: "Failed to delete conversation"
            });
        }
    }
);

// AI TOOL: Clinic overview

router.get("/tools/clinic/overview", async (req, res) => {
    try {
        const [[clientCount]] = await pool.query(`
      SELECT COUNT(*) AS total_clients
      FROM clients
    `);

        const [[unpaidTreatments]] = await pool.query(`
      SELECT
        COUNT(*) AS unpaid_treatments_count,
        COALESCE(SUM(amount), 0) AS unpaid_treatments_total
      FROM treatments
      WHERE status = 'Unpaid'
    `);

        const [[unpaidPurchases]] = await pool.query(`
      SELECT
        COUNT(*) AS unpaid_purchases_count,
        COALESCE(SUM(pr.product_price), 0) AS unpaid_purchases_total
      FROM purchases p
      JOIN products pr
        ON p.product_id = pr.product_id
      WHERE p.status = 'Unpaid'
    `);

        return res.json({
            total_clients: clientCount.total_clients,

            unpaid_treatments: {
                count: unpaidTreatments.unpaid_treatments_count,
                total: Number(unpaidTreatments.unpaid_treatments_total)
            },

            unpaid_purchases: {
                count: unpaidPurchases.unpaid_purchases_count,
                total: Number(unpaidPurchases.unpaid_purchases_total)
            }
        });

    } catch (error) {
        console.error("AI clinic overview error:", error.message);

        return res.status(500).json({
            status: "error",
            message: "Failed to retrieve clinic overview"
        });
    }
});

// AI TOOL: Client birthdays
// month: optional, 1-12

router.get("/tools/clients/birthdays", async (req, res) => {
    try {
        let month = req.query.month
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

        const [clients] = await pool.query(`
      SELECT
        u.user_id AS client_id,
        u.first_name,
        u.last_name,
        u.birth_date
      FROM users u
      JOIN clients c
        ON u.user_id = c.client_id
      WHERE MONTH(u.birth_date) = ?
      ORDER BY DAY(u.birth_date)
    `, [month]);

        return res.json({
            month,
            clients
        });

    } catch (error) {
        console.error("AI birthdays tool error:", error.message);

        return res.status(500).json({
            status: "error",
            message: "Failed to retrieve birthdays"
        });
    }
});

// AI TOOL: Unpaid product purchases

router.get("/tools/finance/unpaid-products", async (req, res) => {
    try {
        const [items] = await pool.query(`
      SELECT
        p.purchase_id,
        u.user_id AS client_id,
        u.first_name,
        u.last_name,
        pr.product_name,
        pr.product_price,
        p.purchase_date
      FROM purchases p
      JOIN users u
        ON p.client_id = u.user_id
      JOIN products pr
        ON p.product_id = pr.product_id
      WHERE p.status = 'Unpaid'
      ORDER BY p.purchase_date DESC
    `);

        const total = items.reduce(
            (sum, item) =>
                sum + Number(item.product_price),
            0
        );

        return res.json({
            count: items.length,
            total,
            items
        });

    } catch (error) {
        console.error(
            "AI unpaid products tool error:",
            error.message
        );

        return res.status(500).json({
            status: "error",
            message: "Failed to retrieve unpaid purchases"
        });
    }
});

// AI TOOL: Client financial summary

router.get(
    "/tools/client/:id/financial-summary",
    async (req, res) => {
        try {
            const clientId = Number(req.params.id);

            if (!Number.isInteger(clientId) || clientId <= 0) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid client ID"
                });
            }

            const [[treatments]] = await pool.query(`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN status = 'Paid'
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS paid_total,

          COALESCE(
            SUM(
              CASE
                WHEN status = 'Unpaid'
                THEN amount
                ELSE 0
              END
            ),
            0
          ) AS unpaid_total

        FROM treatments
        WHERE client_id = ?
      `, [clientId]);


            const [[purchases]] = await pool.query(`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN p.status = 'Paid'
                THEN pr.product_price
                ELSE 0
              END
            ),
            0
          ) AS paid_total,

          COALESCE(
            SUM(
              CASE
                WHEN p.status = 'Unpaid'
                THEN pr.product_price
                ELSE 0
              END
            ),
            0
          ) AS unpaid_total

        FROM purchases p
        JOIN products pr
          ON p.product_id = pr.product_id
        WHERE p.client_id = ?
      `, [clientId]);


            const treatmentRevenue =
                Number(treatments.paid_total);

            const productRevenue =
                Number(purchases.paid_total);

            return res.json({
                client_id: clientId,

                paid: {
                    treatments: treatmentRevenue,
                    products: productRevenue,

                    total:
                        treatmentRevenue +
                        productRevenue
                },

                unpaid: {
                    treatments:
                        Number(treatments.unpaid_total),

                    products:
                        Number(purchases.unpaid_total),

                    total:
                        Number(treatments.unpaid_total) +
                        Number(purchases.unpaid_total)
                }
            });

        } catch (error) {
            console.error(
                "AI financial summary error:",
                error.message
            );

            return res.status(500).json({
                status: "error",
                message:
                    "Failed to retrieve financial summary"
            });
        }
    }
);

// AI TOOL: Client contact information

router.get("/tools/client/:id/contact", async (req, res) => {
    try {
        const clientId = Number(req.params.id);

        if (!Number.isInteger(clientId) || clientId <= 0) {
            return res.status(400).json({
                status: "error",
                message: "Invalid client ID"
            });
        }

        const [clients] = await pool.query(`
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
    ON u.user_id = c.client_id
  WHERE u.user_id = ?
`, [clientId]);

        if (clients.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Client not found"
            });
        }

        return res.json(clients[0]);

    } catch (error) {
        console.error(
            "AI contact tool error:",
            error.message
        );

        return res.status(500).json({
            status: "error",
            message: "Failed to retrieve contact information"
        });
    }
});

module.exports = router;