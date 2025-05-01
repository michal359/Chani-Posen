const express = require("express");
const router = express.Router();
const controller = require('../controllers/productsController');
const authorizeAdmin = require("../middleware/authorizeAdmin")

router.get("/", authorizeAdmin, async (req, res) => {
    try {
        res.send(await controller.getProducts());
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.get("/count", async (req, res) => {
    try {
        const productCount = await controller.getProductsCount();
        res.send({ success: true, totalProducts: productCount });
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
});

router.get("/:id", authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        res.send(await controller.getProductById(id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.post('/', authorizeAdmin, async (req, res) => {
    try {
        const result = await controller.addProduct(req.body);
        res.status(201).send(result);
    } catch (err) {
        console.error("Error in POST /products:", err);
        res.status(500).send({ error: err.message });
    }
});

router.delete("/:id", authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        res.send(await controller.deleteProduct(id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.put('/:id', authorizeAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        res.send(await controller.updateProduct(req.body, id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
})


module.exports = router;