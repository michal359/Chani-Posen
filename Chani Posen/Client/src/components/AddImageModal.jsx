import React, { useState } from "react";
import {
    Box,
    Button,
    Typography,
    IconButton,
    TextField,
    Alert,
} from "@mui/material";
import { serverRequests } from "../Api";
import CloseIcon from "@mui/icons-material/Close";

export default function AddImageModal({ onClose,handleImageAdded, clientId, userId, setImages, onSuccess, onError }) {
    const [imageDescription, setImageDescription] = useState("");
    const [image, setImage] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState(null);

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
        if (!imageDescription.trim()) return "תיאור תמונת טיפול חובה";
        if (!image) return "חובה להעלות תמונת טיפול";
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

            let savedImage = {
                description: imageDescription,
                image_path: "",
                uploaded_at: '',
                uploaded_by: userId,
            };

            if (image) {
                const formData = new FormData();
                formData.append("image", image);
                formData.append("user_id", clientId);
                formData.append("image_type", "treatment");
                formData.append("description", imageDescription);

                const uploadResponse = await serverRequests("POST", `uploads/${userId}`, formData);

                if (!uploadResponse.ok) {
                    throw new Error("Failed to upload treatment image");
                }

                const imageData = await uploadResponse.json();
                savedImage.image_path = `${imageData.imagePath}?v=${new Date().getTime()}`;
                savedImage.uploaded_at = imageData.uploaded_at;

                console.log('image treatment', imageData)
                setImages((prevImages) => {
                    const updatedImages = [...prevImages, savedImage].sort(
                        (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)
                    );
                    return updatedImages;
                });

            }
            handleImageAdded();
            onSuccess("התמונה נוסף בהצלחה!");
            onClose();

        } catch (error) {
            console.error("שגיאה בהוספת תמונה:", error);
            onError("שגיאה בעת הוספת תמונה. נסי שוב.");
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
            <Typography variant="h6" component="h2" gutterBottom>
                הוספת תמונת טיפול חדשה
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}

            <TextField
                fullWidth
                label="תיאור תמונה"
                multiline
                rows={4}
                margin="normal"
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
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
