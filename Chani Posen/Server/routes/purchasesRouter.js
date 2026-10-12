
const express = require("express");
const router = express.Router();

const controller = require("../controllers/purchasesController");
const authorizeAdmin = require("../middleware/authorizeAdmin");
const pool = require("../DB.js");

// Send model results to the client
function sendResult(res, result, status = 200) {
    if (!result || result.success === false) {
        return res.status(400).json(
            result || {
                success: false,
                message: "Operation failed"
            }
        );
    }

    return res.status(status).json(result);
}

// Handle unexpected errors
function handleError(res, err) {
    console.error("Purchases router error:", err);

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });
}

// -----------------------------------------
// 1. Get client purchases
// -----------------------------------------
router.get("/client/:id", authorizeAdmin, async (req, res) => {
    try {
        const result =
            await controller.getClientsPurchasesById(
                req.params.id
            );

        return sendResult(res, result);
    } catch (err) {
        return handleError(res, err);
    }
});

// -----------------------------------------
// 2. Get client wallet balance
// -----------------------------------------
router.get("/wallet/:clientId", authorizeAdmin, async (req, res) => {
    try {
        const clientId = Number(req.params.clientId);

        if (!Number.isSafeInteger(clientId) || clientId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid client ID"
            });
        }

        const [clients] = await pool.execute(
            "SELECT client_id FROM clients WHERE client_id = ?",
            [clientId]
        );

        if (clients.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }

        const [wallets] = await pool.execute(
            `SELECT credit_balance
             FROM wallets
             WHERE client_id = ?`,
            [clientId]
        );

        const balance = wallets.length > 0
            ? wallets[0].credit_balance
            : "0.00";

        return res.status(200).json({
            success: true,
            client_id: clientId,
            credit_balance: balance
        });

    } catch (err) {
        return handleError(res, err);
    }
});

// -----------------------------------------
// 3. Create purchase
// -----------------------------------------
router.post("/", authorizeAdmin, async (req, res) => {
    try {
        const result = await controller.addPurchase(
            req.body
        );

        return sendResult(res, result, 201);
    } catch (err) {
        return handleError(res, err);
    }
});

// -----------------------------------------
// 4. Add payment to existing purchase
// -----------------------------------------
router.put("/:id", authorizeAdmin, async (req, res) => {
    try {
        const result =
            await controller.updatePurchaseStatus(
                req.body,
                req.params.id
            );

        return sendResult(res, result);
    } catch (err) {
        return handleError(res, err);
    }
});

// -----------------------------------------
// 5. Delete unpaid purchase
// -----------------------------------------
router.delete("/:id", authorizeAdmin, async (req, res) => {
    try {
        const result = await controller.deletePurchase(
            req.params.id
        );

        return sendResult(res, result);
    } catch (err) {
        return handleError(res, err);
    }
});

// -----------------------------------------
// 6. Deposit money into wallet
// -----------------------------------------
router.post(
    "/wallet/deposit",
    authorizeAdmin,
    async (req, res) => {
        try {
            const result =
                await controller.depositToWallet(
                    req.body
                );

            return sendResult(res, result, 201);
        } catch (err) {
            return handleError(res, err);
        }
    }
);

module.exports = router;
