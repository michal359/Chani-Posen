const express = require("express");
const router = express.Router();

const controller = require("../controllers/treatmentsController");
const authorizeAdmin = require("../middleware/authorizeAdmin");


// Get all treatments for a specific client
router.get("/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const result =
            await controller.getTreatmentsByClientId(id);

        res.send(result);

    } catch (err) {
        console.error(
            "Error in GET /treatments/:id:",
            err
        );

        res.status(500).send({
            ok: false,
            error: err.message
        });
    }
});


// Delete treatment
router.delete(
    "/:id",
    authorizeAdmin,
    async (req, res) => {
        const id = req.params.id;

        try {
            const result =
                await controller.deleteTreatment(id);

            res.send(result);

        } catch (err) {
            console.error(
                "Error in DELETE /treatments/:id:",
                err
            );

            res.status(400).send({
                ok: false,
                error: err.message
            });
        }
    }
);


// Update treatment
router.put(
    "/:id",
    authorizeAdmin,
    async (req, res) => {
        const id = req.params.id;

        try {
            const result =
                await controller.updateTreatment(
                    req.body,
                    id
                );

            res.send(result);

        } catch (err) {
            console.error(
                "Error in PUT /treatments/:id:",
                err
            );

            res.status(400).send({
                ok: false,
                error: err.message
            });
        }
    }
);


// Create treatment
router.post(
    "/",
    authorizeAdmin,
    async (req, res) => {
        try {
            console.log(
                "Received treatment body:",
                req.body
            );

            const {
                client_id,
                treatment_type_id,
                treatment_date,
                duration
            } = req.body;

            if (
                !client_id ||
                !treatment_type_id ||
                !treatment_date ||
                isNaN(Number(duration))
            ) {
                console.warn(
                    "Missing or invalid treatment fields:",
                    req.body
                );

                return res.status(400).send({
                    success: false,
                    error:
                        "Missing or invalid required treatment fields"
                });
            }

            const result =
                await controller.createTreatment(
                    req.body
                );

            res.status(201).send(result);

        } catch (err) {
            console.error(
                "Error in POST /treatments:",
                err
            );

            res.status(500).send({
                success: false,
                error: err.message
            });
        }
    }
);


module.exports = router;