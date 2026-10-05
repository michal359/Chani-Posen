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

    if (!question) {
      return res.status(400).json({
        status: "error",
        message: "Question is required"
      });
    }

    const response = await axios.post(
      "http://127.0.0.1:8000/agent",
      {
        question: question
      },
      {
        timeout: 30000
      }
    );

    return res.json(response.data);

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

module.exports = router;