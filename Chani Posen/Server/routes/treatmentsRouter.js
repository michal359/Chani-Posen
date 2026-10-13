
const express = require("express");
const router = express.Router();

const controller = require("../controllers/treatmentsController");
const authorizeAdmin = require("../middleware/authorizeAdmin");

// -----------------------------------------
// Response helpers
// -----------------------------------------
function sendResult(res, result, successStatus = 200) {
    if (!result || result.success === false) {
        return res.status(400).json(
            result || {
                success: false,
                message: "Operation failed"
            }
        );
    }

    return res.status(successStatus).json(result);
}

function handleError(res, err, operation) {
    console.error(`Error in ${operation}:`, err);

    return res.status(400).json({
        success: false,
        message: err.message || "Operation failed"
    });
}

// -----------------------------------------
// 1. Get all treatments for a client
// GET /treatments/:id
// -----------------------------------------
router.get("/:id", async (req, res) => {
    try {
        const result =
            await controller.getTreatmentsByClientId(
                req.params.id
            );

        return sendResult(res, result);

    } catch (err) {
        return handleError(
            res,
            err,
            "GET /treatments/:id"
        );
    }
});

// -----------------------------------------
// 2. Add payment to an existing treatment
// POST /treatments/:id/payments
// -----------------------------------------
router.post(
    "/:id/payments",
    authorizeAdmin,
    async (req, res) => {
        try {
            const treatmentId = Number(req.params.id);

            if (
                !Number.isSafeInteger(treatmentId) ||
                treatmentId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid treatment ID"
                });
            }

            const {
                directAmount = 0,
                walletAmount = 0
            } = req.body || {};

            const validMoney = (value) => {
                if (value === null || value === "") {
                    return false;
                }

                const number = Number(value);

                return (
                    Number.isFinite(number) &&
                    number >= 0 &&
                    Math.abs(
                        number * 100 -
                        Math.round(number * 100)
                    ) < 1e-7
                );
            };

            if (
                !validMoney(directAmount) ||
                !validMoney(walletAmount)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment amounts"
                });
            }

            if (
                Number(directAmount) === 0 &&
                Number(walletAmount) === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a payment amount"
                });
            }

            const result =
                await controller.addTreatmentPayment(
                    {
                        directAmount,
                        walletAmount
                    },
                    treatmentId
                );

            return sendResult(res, result, 201);

        } catch (err) {
            return handleError(
                res,
                err,
                "POST /treatments/:id/payments"
            );
        }
    }
);

// -----------------------------------------
// 3. Delete treatment
// DELETE /treatments/:id
// -----------------------------------------
router.delete(
    "/:id",
    authorizeAdmin,
    async (req, res) => {
        try {
            const result =
                await controller.deleteTreatment(
                    req.params.id
                );

            return sendResult(res, result);

        } catch (err) {
            return handleError(
                res,
                err,
                "DELETE /treatments/:id"
            );
        }
    }
);

// -----------------------------------------
// 4. Update treatment details
// PUT /treatments/:id
// -----------------------------------------
router.put(
    "/:id",
    authorizeAdmin,
    async (req, res) => {
        try {
            const result =
                await controller.updateTreatment(
                    req.body,
                    req.params.id
                );

            return sendResult(res, result);

        } catch (err) {
            return handleError(
                res,
                err,
                "PUT /treatments/:id"
            );
        }
    }
);

// -----------------------------------------
// 5. Create treatment
// POST /treatments
// -----------------------------------------
router.post(
    "/",
    authorizeAdmin,
    async (req, res) => {
        try {
            const {
                client_id,
                treatment_type_id,
                treatment_date,
                duration
            } = req.body || {};

            if (
                !client_id ||
                !treatment_type_id ||
                !treatment_date ||
                !Number.isSafeInteger(Number(duration)) ||
                Number(duration) <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Missing or invalid required treatment fields"
                });
            }

            const result =
                await controller.createTreatment(
                    req.body
                );

            return sendResult(res, result, 201);

        } catch (err) {
            return handleError(
                res,
                err,
                "POST /treatments"
            );
        }
    }
);

module.exports = router;
