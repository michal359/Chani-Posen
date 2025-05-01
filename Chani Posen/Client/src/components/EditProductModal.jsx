import React, { useState, useEffect, useRef } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Alert,
    IconButton,
    Modal,
    Backdrop
} from "@mui/material";
import { serverRequests } from "../Api";
import CloseIcon from "@mui/icons-material/Close";

export default function EditProductModal({ product, setProduct, onClose, userId, onError, onSuccess }) {
    const [productName, setProductName] = useState(product.product_name);
    const [productDescription, setProductDescription] = useState(product.product_description);
    const [productPrice, setProductPrice] = useState(product.product_price);
    const [image, setImage] = useState(null);
    const [imageUrl, setImageUrl] = useState(product.image_path);
    const [error, setError] = useState("");
    const modalRef = useRef(null);

    useEffect(() => {
        if (error) {
            modalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [error]);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                setError("יש לבחור קובץ תמונה תקין");
                return;
            }
            setError("");
            setImage(file);
            setImageUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
        setImageUrl("");
    };

    const validateForm = () => {
        if (!productName.trim()) return "שם מוצר חובה";
        if (!productDescription.trim()) return "תיאור מוצר חובה";
        if (productDescription.length > 5000) return "תיאור המוצר לא יכול לעלות על 5000 תווים";
        if (!productPrice || isNaN(productPrice) || Number(productPrice) <= 0) return "יש להזין מחיר תקין";
        if (!imageUrl) return "חובה להעלות תמונה";
        return null;
    };

    const handleSubmit = async () => {
        setError("");
        const errorMsg = validateForm();
        if (errorMsg) {
            setError(errorMsg);
            return;
        }

        const productData = {
            product_name: productName,
            product_description: productDescription,
            product_price: productPrice,
            image_path: imageUrl
        };

        serverRequests("PUT", `products/${product.product_id}`, productData)
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error("Failed to update product");
                }

                if (image) {
                    const formData = new FormData();
                    formData.append("image", image);
                    formData.append("product_id", product.product_id)
                    formData.append("image_type", "product");
                    formData.append("description", `מוצר מספר ${product.product_id}`);
                    formData.append("uploaded_by", userId || "");
                
                    return serverRequests('PUT', `uploads/image/${userId}`, formData);
                }
            })
            .then(() => {
                setProduct({
                    ...product,
                    product_name: productName,
                    product_description: productDescription,
                    product_price: productPrice,
                    image_path: imageUrl
                });
                onSuccess("פרטי המוצר עודכנו בהצלחה!");
                    setTimeout(() => {
                        onClose();
                    }, 2000);
            })
            .catch((error) => {
                onError("שגיאה בעדכון מוצר, נסי שוב")
                console.error("שגיאה בעדכון מוצר:", error);
            });
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            closeAfterTransition
            BackdropComponent={Backdrop}
            BackdropProps={{ timeout: 500 }}
        >
            <Box
                ref={modalRef}
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 400,
                    maxHeight: "80vh",
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "8px",
                    overflow: "auto",
                    outline: "none"
                }}
            >
                <IconButton
                    onClick={onClose}
                    sx={{ position: "absolute", top: 10, right: 10 }}
                >
                    <CloseIcon />
                </IconButton>
                <br></br>

                <Typography variant="h6" gutterBottom>
                    עריכת פרטי מוצר
                </Typography>

                {error && <Alert severity="error">{error}</Alert>}

                <TextField
                    fullWidth
                    label="שם מוצר"
                    margin="normal"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                />

                <TextField
                    fullWidth
                    label="תיאור מוצר"
                    multiline
                    rows={10}
                    margin="normal"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    helperText={`${productDescription.length}/5000`}
                    error={productDescription.length > 5000}
                />

                <TextField
                    fullWidth
                    label="מחיר"
                    type="number"
                    margin="normal"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                />

                <Box sx={{ textAlign: "center", my: 2 }}>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: "none" }}
                        id="image-upload"
                    />
                    <label htmlFor="image-upload">
                        <Button variant="contained" component="span">
                            העלאת תמונה
                        </Button>
                    </label>
                </Box>

                {imageUrl && (
                    <Box sx={{ textAlign: "center", my: 2 }}>
                        <img
                            src={imageUrl}
                            alt="תמונת מוצר"
                            style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: "8px" }}
                        />
                        <Button color="error" onClick={handleRemoveImage} sx={{ mt: 1 }}>
                            מחיקת תמונה
                        </Button>
                    </Box>
                )}

                <Box sx={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={!imageUrl} // חסימת כפתור השמירה אם אין תמונה
                    >
                        שמירה
                    </Button>
                    <Button variant="outlined" onClick={onClose}>
                        ביטול
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}
