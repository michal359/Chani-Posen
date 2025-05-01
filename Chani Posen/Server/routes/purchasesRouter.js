const express = require("express");
const router = express.Router();
const controller = require('../controllers/purchasesController');
const authorizeAdmin = require("../middleware/authorizeAdmin")


router.get("/client/:id", authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        res.send(await controller.getClientsPurchasesById(id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.post('/', authorizeAdmin, async (req, res) => {
    try {
        const result = await controller.addPurchase(req.body);
        res.status(201).send(result);
    } catch (err) {
        console.error("Error in POST /purchase:", err);
        res.status(500).send({ error: err.message });
    }
});

router.delete("/:id", authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        res.send(await controller.deletePurchase(id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.put('/:id', authorizeAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        res.send(await controller.updatePurchaseStatus(req.body, id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
})


module.exports = router;