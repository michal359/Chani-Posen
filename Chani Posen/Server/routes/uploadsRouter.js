const express = require("express");
const fileUpload = require("express-fileupload");
const router = express.Router();
const controller = require("../controllers/uploadsController");

router.use(fileUpload());
router.use(express.urlencoded({ extended: true }));

router.post("/:uploaded_by", async (req, res) => {
    const { uploaded_by } = req.params;
    const { user_id, product_id, image_type, description } = req.body;
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).send({ success: false, message: "No file uploaded" });
        }
        const file = req.files.image;
        const result = await controller.uploadImage(file, {
            userId: user_id,
            productId: product_id || null,
            image_type,
            description,
            uploaded_by
        });
        if (!result.success) {
            return res.status(500).send(result);
        }
        res.send(result);
    } catch (err) {
        console.error("Error in image upload:", err);
        res.status(500).send({ success: false, message: err.message });
    }
});

router.put("/image/:user_id", async (req, res) => {
    const { user_id } = req.params;
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }
        const { image_type, description, uploaded_by, product_id, image_id } = req.body;
        if (!image_type || !description || !uploaded_by) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        const file = req.files.image;
        const result = await controller.updateImage(user_id, product_id, file, image_type, description, uploaded_by, image_id);
        if (!result.success) {
            return res.status(500).json(result);
        }
        res.json(result);
    } catch (err) {
        console.error("Error updating image:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
