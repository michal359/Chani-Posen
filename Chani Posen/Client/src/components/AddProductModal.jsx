import React, { useState } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Alert,
    IconButton
} from "@mui/material";
import { serverRequests } from "../Api";
import CloseIcon from '@mui/icons-material/Close';

export default function AddProductModal({ onClose, userId, setAllProducts, setFilteredProducts, onSuccess, onError }) {
    const [productName, setProductName] = useState("");
    const [productDescription, setProductDescription] = useState("");
    const [productPrice, setProductPrice] = useState("");
    const [image, setImage] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState("");

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
        if (!image) return "חובה להעלות תמונה למוצר";
        return null;
    };

    const handleSubmit = async () => {
        setError("");
        const errorMsg = validateForm();
        if (errorMsg) {
            setError(errorMsg);
            return;
        }

        try {
            const productData = {
                product_name: productName,
                product_description: productDescription,
                product_price: productPrice,
            };

            const response = await serverRequests("POST", "products", productData);

            if (!response.ok) {
                throw new Error("Failed to add product");
            }

            const data = await response.json();
            const newProductId = data.product_id;

            console.log("מוצר נוסף בהצלחה עם ID:", newProductId);

            let savedProduct = {
                product_id: newProductId,
                product_name: productName,
                product_description: productDescription,
                product_price: productPrice,
                image_path: "", // נעדכן אחרי העלאת התמונה
            };

            if (image) {
                const formData = new FormData();
                formData.append("image", image);
                formData.append("user_id", userId);
                formData.append("product_id", newProductId);
                formData.append("image_type", "product");
                formData.append("description", `מוצר מספר ${newProductId}`);

                const uploadResponse = await serverRequests("POST", `uploads/${userId}`, formData);

                if (!uploadResponse.ok) {
                    throw new Error("Failed to upload product image");
                }

                const imageData = await uploadResponse.json();
                savedProduct.image_path = `${imageData.imagePath}?v=${new Date().getTime()}`;
                
                console.log('image product',imageData)
                setAllProducts((prevProducts) => {
                    const updatedProducts = [...prevProducts, savedProduct].sort(
                        (a, b) => a.product_name.localeCompare(b.product_name, "he")
                    );

                    setFilteredProducts(updatedProducts);
                    return updatedProducts;
                });
            }

            onSuccess("המוצר נוסף בהצלחה!");
            onClose();

        } catch (error) {
            console.error("שגיאה בהוספת מוצר:", error);
            onError("שגיאה בעת הוספת מוצר. נסי שוב.");
        }
    };


    return (
        <Box
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
            }}
        >
            <IconButton
                onClick={onClose}
                sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    color: "text.primary",
                }}
            >
                <CloseIcon />
            </IconButton>
            <br></br>
            <Typography variant="h6" component="h2" gutterBottom>
                הוספת מוצר חדש
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
                    <Button
                        variant="contained"
                        component="span"
                        sx={{
                            backgroundColor: '#B68FFF',
                            color: '#fff',
                            '&:hover': { backgroundColor: '#A256E8' },
                            order: { xs: 1, sm: 0 },
                        }}
                    >
                        העלאת תמונה
                    </Button>
                </label>
            </Box>

            {imageUrl && (
                <Box sx={{ textAlign: "center", my: 2 }}>
                    <img
                        src={imageUrl}
                        alt="תמונה נבחרה"
                        style={{
                            width: "100%",  
                            maxHeight: 200,
                            objectFit: "contain", 
                            borderRadius: "8px",
                        }}
                    />
                    <Button color="error" onClick={handleRemoveImage} sx={{ mt: 1 }}>
                        מחיקת תמונה
                    </Button>
                </Box>
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    sx={{
                        backgroundColor: '#B68FFF',
                        color: '#fff',
                        '&:hover': { backgroundColor: '#A256E8' },
                        order: { xs: 1, sm: 0 },
                    }}
                >
                    הוספה
                </Button>
                <Button
                    variant="outlined"
                    onClick={onClose}
                >
                    ביטול
                </Button>
            </Box>
        </Box>
    );
}
