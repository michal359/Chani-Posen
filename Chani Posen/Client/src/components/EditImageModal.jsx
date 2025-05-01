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

export default function EditImageModal({ onClose, selectedImage, clientId, userId, setSelectedImage, onSuccess, onError }) {
    const [imageDescription, setImageDescription] = useState(selectedImage.description);
    const [image, setImage] = useState(null);
    const [imageUrl, setImageUrl] = useState(selectedImage.image_path);
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
        if (!imageDescription.trim()) return "תיאור תמונה חובה";
        if (!imageUrl) return "חובה להעלות תמונת טיפול";
        return null;
    };

    const handleSubmit = async () => {
        setError("");
        const errorMsg = validateForm();
        if (errorMsg) {
            setError(errorMsg);
            return;
        }

        if (image || imageDescription) {
            const formData = new FormData();
            formData.append("image", image);
            formData.append("user_id", clientId || "");
            formData.append("image_type", "treatment");
            formData.append("description", imageDescription);
            formData.append("uploaded_by", userId || "");
            formData.append("image_id", selectedImage.image_id)

            return serverRequests('PUT', `uploads/image/${clientId}`, formData)
                .then(() => {
                    setSelectedImage({
                        ...selectedImage,
                        description: imageDescription,
                        image_path: `${imageUrl}?t=${Date.now()}`
                     });
                     
                    onSuccess("תמונת הטיפול עודכנה בהצלחה!");
                    onClose();

                })
                .catch((error) => {
                    onError("שגיאה בעדכון תמונה, נסי שוב");
                    console.error("שגיאה בעדכון תמונה:", error);
                });
        }

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
                    עריכת פרטי תמונת טיפול
                </Typography>

                {error && <Alert severity="error">{error}</Alert>}

                <TextField
                    fullWidth
                    label="תיאור תמונת טיפול"
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
                        <Button variant="contained" component="span">
                            העלאת תמונה
                        </Button>
                    </label>
                </Box>

                {imageUrl && (
                    <Box sx={{ textAlign: "center", my: 2 }}>
                        <img
                            src={imageUrl}
                            alt="תמונת טיפול"
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
                        disabled={!imageUrl}
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
