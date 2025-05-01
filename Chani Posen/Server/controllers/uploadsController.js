const path = require('path');
const fs = require('fs');
const model = require('../model/uploadsModel');

async function uploadImage(file, { userId, productId, image_type, description, uploaded_by }) {
    try {
        if (!file) {
            throw new Error("No file uploaded");
        }

        let uploadsDir;
        switch (image_type) {
            case "profile":
                uploadsDir = path.join(__dirname, '../uploads/images/profileImages');
                break;
            case "product":
                uploadsDir = path.join(__dirname, '../uploads/images/productImages');
                break;
            case "treatment":
                uploadsDir = path.join(__dirname, '../uploads/images/treatmentImages');
                break;
            default:
                uploadsDir = path.join(__dirname, '../uploads/images/otherImages');
        }

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileExtension = path.extname(file.name);
        const fileName = `${productId ? productId : userId}_${image_type}_${Date.now()}${fileExtension}`;
        const filePath = path.join(uploadsDir, fileName);

        console.log("Saving file to:", filePath);

        await file.mv(filePath);

        const dbPath = `/uploads/images/${image_type}Images/${fileName}`;
        const saveResult = await model.saveImagePath({ userId, productId, image_type, dbPath, description, uploaded_by });
        console.log("Saving to DB:", { userId, productId, image_type, dbPath, description, uploaded_by });

        if (!saveResult.success) {
            throw new Error("Failed to save image path in database");
        }

        return { success: true, message: "Image uploaded successfully", imagePath: `http://localhost:3000${dbPath}` };
    } catch (err) {
        console.error('Error uploading image', err);
        return { success: false, message: err.message };
    }
}

async function updateImage(userId, productId, file, image_type, description, uploaded_by, image_id) {
    try {
        let oldImage;

        if (image_type === 'product') {
            oldImage = await model.getProductImage(productId);
        } else if (image_type === 'profile') {
            oldImage = await model.getUserProfileImage(userId);
        } else if (image_type === 'treatment') {
            oldImage = await model.getTreatmentImage(userId);
        }

        if (oldImage && oldImage.image_path) {
            const oldImagePath = path.join(__dirname, '../uploads', oldImage.image_path.replace('/uploads/', ''));
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
            if (image_type === 'product') {
                await model.deleteProductImage(productId);
            } else if (image_type === 'profile') {
                await model.deleteUserProfileImage(userId);
            }  else if (image_type === 'treatment') {
                await model.deleteUserTreatmentImage(image_id);
            }
        }

        const uploadsDir = path.join(__dirname, `../uploads/images/${image_type}Images`);
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const fileExtension = path.extname(file.name);
        const fileName = `${productId ? productId : userId}_${image_type}_${Date.now()}${fileExtension}`;
        const filePath = path.join(uploadsDir, fileName);

        await file.mv(filePath);

        const dbPath = `/uploads/images/${image_type}Images/${fileName}`;
        const saveResult = await model.saveImagePath({
            userId,
            productId,
            image_type,
            dbPath,
            description,
            uploaded_by
        });

        if (!saveResult.success) throw new Error("Failed to save image path in database");

        return { success: true, message: "Image updated successfully", imagePath: dbPath };
    } catch (err) {
        console.error('Error updating image:', err);
        return { success: false, message: err.message };
    }
}

module.exports = { uploadImage, updateImage };