const express = require("express");
const router = express.Router();
const controller = require('../controllers/treatmentsController');
const authorizeAdmin = require("../middleware/authorizeAdmin")

router.get("/:id", async (req, res) => {
    const id = req.params.id;
    try {
        res.send(await controller.getTreatmentsByClientId(id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.delete("/:id", authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        res.send(await controller.deleteTreatment(id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.put('/:id', authorizeAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        res.send(await controller.updateTreatment(req.body, id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
})

router.post('/', authorizeAdmin, async (req, res) => {
    try {
        console.log("Received body:", req.body); // לוודא שהנתונים מגיעים
        const { treatment_type, treatment_date, client_id, duration, summary, status, amount } = req.body;

        if (!treatment_type || !treatment_date) {
            console.warn("Missing fields:", { treatment_type, treatment_date });
            return res.status(400).send({ error: "Missing fields" });
        }

        const result = await controller.createTreatment(req.body);
        res.status(201).send(result);
    } catch (err) {
        console.error("Error in POST /treatments:", err);
        res.status(500).send({ error: err.message });
    }
});



module.exports = router;
