const express = require("express");
const router = express.Router();
const controller = require('../controllers/notificationsController');

router.get("/:id", async (req, res) => {
    const id = req.params.id;
    try {
        res.send(await controller.getNotificationsById(id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.get("/:id/unread-count", async (req, res) => {
    const id = req.params.id;
    try {
        const count = await controller.getUnreadNotificationsCount(id);
        res.send({ success: true, count });
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
});

router.post("/", async (req, res) => {
    const { user_id, notification_text, notification_type, entity_type, entity_id, link } = req.body;

    if (!user_id || !notification_text || !notification_type) {
        return res.status(400).send({ success: false, message: "Missing required fields" });
    }

    try {
        const result = await controller.addNotification(
            user_id,
            notification_text,
            notification_type,
            entity_type || 'NONE',
            entity_id || null,
            link || null
        );
        res.send(result);
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
});

module.exports = router;