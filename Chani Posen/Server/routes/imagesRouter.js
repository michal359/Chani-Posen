const express = require("express");
const router = express.Router();
const controller = require('../controllers/imagesController');
const authorizeAdmin = require("../middleware/authorizeAdmin")
const authenticateSession = require('../middleware/authenticateSession');
const pool = require('../DB.js');


router.get("/:id", authorizeAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        res.send(await controller.getImagesByClientId(id));
    } catch (err) {
        res.status(500).send({ ok: false });
    }
});

router.delete("/:id", authenticateSession, async (req, res) => {
    const imageId = req.params.id;
    const user = req.user; 
    try {
        const [rows] = await pool.execute(
            "SELECT uploaded_by FROM images WHERE image_id = ?",
            [imageId]
        );

        if (rows.length === 0) {
            return res.status(404).send({ success: false, message: "Image not found" });
        }

        const imageOwnerId = rows[0].uploaded_by; 

        if (user.role_id === 1 || (user.role_id === 2 && user.user_id === imageOwnerId)) {
            await pool.execute("DELETE FROM images WHERE image_id = ?", [imageId]);
            return res.send({ success: true, message: "Successfully deleted image" });
        } else {
            return res.status(403).send({
                success: false,
                message: "You do not have permission to delete this image"
            });
        }
    } catch (err) {
        console.error('Error deleting image:', err);
        return res.status(500).send({ success: false, message: "Internal server error" });
    }
});

module.exports = router;