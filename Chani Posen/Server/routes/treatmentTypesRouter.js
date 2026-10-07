const express = require("express");
const router = express.Router();

const controller = require("../controllers/treatmentTypesController");

router.get("/", async (req, res) => {
    try {
        const result =
            await controller.getTreatmentTypes();

        res.send(result);

    } catch (error) {
        console.error(
            "Error in GET /treatment-types:",
            error
        );

        res.status(500).send({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;