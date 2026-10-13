
const express = require("express");
const router = express.Router();

const controller = require("../controllers/walletController");
const authorizeAdmin = require("../middleware/authorizeAdmin");

// ---------------------------------------------
// Helpers
// ---------------------------------------------

function validClientId(value) {
    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0;
}

function sendResult(res, result, successStatus = 200) {
    if (!result || result.success !== true) {
        return res.status(400).json(
            result || {
                success: false,
                message: "הפעולה נכשלה"
            }
        );
    }

    return res.status(successStatus).json(result);
}

function handleError(res, error) {
    console.error("Wallet router error:", error);

    return res.status(500).json({
        success: false,
        message: "שגיאה פנימית בשרת"
    });
}

// Require administrator authorization for
// every wallet route.
router.use(authorizeAdmin);

// ---------------------------------------------
// 1. Get wallet balance and activity
// GET /wallet/:clientId
// ---------------------------------------------

router.get("/:clientId", async (req, res) => {
    try {
        const { clientId } = req.params;

        if (!validClientId(clientId)) {
            return res.status(400).json({
                success: false,
                message: "מזהה לקוח אינו תקין"
            });
        }

        const result =
            await controller.getWalletByClientId(clientId);

        return sendResult(res, result);

    } catch (error) {
        return handleError(res, error);
    }
});

// ---------------------------------------------
// 2. Add or reduce wallet balance
// POST /wallet/:clientId/adjust
// ---------------------------------------------

router.post("/:clientId/adjust", async (req, res) => {
    try {
        const { clientId } = req.params;

        if (!validClientId(clientId)) {
            return res.status(400).json({
                success: false,
                message: "מזהה לקוח אינו תקין"
            });
        }

        const { action, amount, note } = req.body || {};

        if (!["CREDIT", "DEBIT"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "יש לבחור הוספה או הפחתה"
            });
        }

        const numericAmount = Number(amount);

        if (
            amount === null ||
            amount === undefined ||
            amount === "" ||
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0 ||
            Math.abs(
                numericAmount * 100 -
                Math.round(numericAmount * 100)
            ) > 1e-7
        ) {
            return res.status(400).json({
                success: false,
                message: "יש להזין סכום חיובי ותקין"
            });
        }

        if (
            typeof note !== "string" ||
            !note.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "יש להזין סיבה לפעולה"
            });
        }

        if (note.trim().length > 400) {
            return res.status(400).json({
                success: false,
                message: "ההערה ארוכה מדי"
            });
        }

        const result = await controller.adjustWallet(
            clientId,
            {
                action,
                amount: numericAmount,
                note: note.trim()
            }
        );

        return sendResult(res, result, 200);

    } catch (error) {
        return handleError(res, error);
    }
});

module.exports = router;
