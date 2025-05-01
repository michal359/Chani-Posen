const express = require("express");
const router = express.Router();
const controller = require('../controllers/recommendationsController');
const authorizeAdmin = require("../middleware/authorizeAdmin")

router.post('/', authorizeAdmin, async (req, res) => {
    try {
        const result = await controller.addRecommendation(req.body);
        res.status(201).send(result);
    } catch (err) {
        console.error("Error in POST /recommendations:", err);
        if (err.status === 409) {
            res.status(409).send({ error: err.message });
        } else {
            res.status(500).send({ error: err.message });
        }
    }
});

router.get("/:id", authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        res.send(await controller.getRecommendations(id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.delete("/:id", authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        res.send(await controller.deleteRecommendation(id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

module.exports = router;