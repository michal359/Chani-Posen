const express = require("express");
const router = express.Router();
const controller = require('../controllers/clientsController')
const verificationController = require('../controllers/verificationController')
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
const authorizeAdmin = require("../middleware/authorizeAdmin")

router.get("/", authorizeAdmin, async (req, res) => {
    try {
        await controller.getAllClients(req, res);
    } catch (err) {
        console.error("Error in GET /:", err); 
        res.status(500).send({ ok: false, message: err.message });
    }
});

router.get("/count", async (req, res) => {
    try {
        const clientCount = await controller.getClientsCount();
        res.send({ success: true, totalClients: clientCount });
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
});

router.get("/:id", authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    const productId = req.query.productId; 

    try {
        if (productId) {
            res.send(await controller.getClientsByProductId(productId));
        } else {
            res.send(await controller.getClient(id));
        }
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});


router.put('/:id', authorizeAdmin,  async (req, res) => {
    try {
        const id = req.params.id;
        res.send(await controller.updateClient(req.body, id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
})

router.post('/', authorizeAdmin, async (req, res) => {
    try {
        res.send(await controller.createNewClient(req.body));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
})

router.delete('/:id', authorizeAdmin,  async (req, res) => {
    try {
        const id = req.params.id;
        res.send(await controller.deleteClient(id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
})

router.get('/verify-token/:token', async (req, res) => {
    try {
        const token = req.params.token;
        res.send(await verificationController.verifyToken(token));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.post('/set-password', async (req, res) => {
    try {
        res.send(await verificationController.setPassword(req.body));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.post('/resend-verification', async (req, res) => {
    try {
        res.send(await verificationController.resendVerification(req.body));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

module.exports = router