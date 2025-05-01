import React, { useState, useEffect, useRef } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Alert,
    IconButton,
    Modal,
    Chip,
    Backdrop
} from "@mui/material";
import { serverRequests } from "../Api";
import CloseIcon from "@mui/icons-material/Close";

const skinTypes = ["רגיל", "יבש וחסר לחות", "שמן", "בעייתי", "מעורב"];
const statuses = [
    "שלב 1 - איבחון",
    "שלב 2 - אסטרטגיה",
    "שלב 3 - טיפול בקליניקה",
    "שלב 4 - התמדה ומעקב",
    "עדיין לא פנתה לקבלת שירות",
];

const statusColors = {
    "שלב 1 - איבחון": "#AEE5FF",
    "שלב 2 - אסטרטגיה": "#B68FFF",
    "שלב 3 - טיפול בקליניקה": "#FFD966",
    "שלב 4 - התמדה ומעקב": "#66FF66",
    "עדיין לא פנתה לקבלת שירות": "#FF85C1",
};

const skinTypeColor = statusColors["שלב 2 - אסטרטגיה"];

export default function EditClientDetailsModal({ clientData, setClientData, onClose, userId, onError, onSuccess }) {
    const [firstName, setFirstName] = useState(clientData.first_name);
    const [lastName, setLastName] = useState(clientData.last_name);
    const [email, setEmail] = useState(clientData.email);
    const [phone, setPhone] = useState(clientData.phone);
    const [birthDate, setBirthDate] = useState(clientData.birth_date);
    const [treatmentStatus, setTreatmentStatus] = useState(clientData.treatment_status);
    const [skinType, setSkinType] = useState(clientData.skin_type);
    const [image, setImage] = useState(null);
    const [imageUrl, setImageUrl] = useState(clientData.profile_image);
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
        if (!firstName.trim()) return "שם פרטי חובה";
        if (!lastName.trim()) return "שם משפחה חובה";
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return 'אימייל לא תקין';
        }
        if (!phone || !/^\d{10}$/.test(phone)) return "מספר טלפון לא תקין";
        if (!birthDate || isNaN(new Date(birthDate)))
            return "תאריך לידה לא תקין";
        if ((new Date().getFullYear() - new Date(birthDate).getFullYear()) < 10)
            return "הלקוחה צעירה מידיי";
        if ((new Date().getFullYear() - new Date(birthDate).getFullYear()) > 100)
            return "הלקוחה מבוגרת מידיי";
        if (!treatmentStatus.trim()) return "סטטוס חובה";
        if (!skinType.trim()) return "סוג עור חובה";
        if (!imageUrl) return "חובה להעלות תמונה";
        return null;
    };

    const handleSaveEditDetails = () => {
        setError("");
        const errorMsg = validateForm();
        if (errorMsg) {
            setError(errorMsg);
            return;
        }

        const url = `clients/${clientData.user_id}`;
        const clientEditedData = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            birth_date: new Date(birthDate).toISOString().split('T')[0],
            treatment_status: treatmentStatus,
            skin_type: skinType,
            image_path: imageUrl
        };
        serverRequests('PUT', url, clientEditedData)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update client');
                }
                if (image) {
                    const formData = new FormData();
                    formData.append('image', image);
                    formData.append("image_type", "profile");
                    formData.append("description", `תמונת פרופיל של לקוח ${clientData.user_id}`);
                    formData.append('uploaded_by', userId || '');                
                    return serverRequests("PUT", `uploads/image/${clientData.user_id}`, formData);
                }
                
            })
            .then(() => {
                onSuccess('פרטי הלקוחה עודכנו בהצלחה!')
                setClientData({
                    ...clientData,
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone: phone,
                    birth_date: new Date(birthDate).toISOString().split('T')[0],
                    treatment_status: treatmentStatus,
                    skin_type: skinType,
                    profile_image: imageUrl
                });
                setTimeout(() => {
                    onClose();
                }, 2000);
            })
            .catch(error => {
                onError('הייתה שגיאה בעידכון, נסי שוב')
                console.error('Error updating client:', error);
            })
    };

    const handleEditChange = (field, value) => {
        if (field === 'skin_type') {
            setSkinType(value);
        } else {
            setTreatmentStatus(value);
        }
    };

    const renderChipSelection = (items, selectedValue, field, colorMap) => {
        return items.map(item => (
            <Chip
                key={item}
                label={item}
                onClick={() => handleEditChange(field, item)}
                sx={{
                    margin: 0.5,
                    backgroundColor: selectedValue === item ? colorMap[item] : 'transparent',
                    border: `2px solid ${colorMap[item] || '#ccc'}`,
                    color: selectedValue === item ? 'white' : colorMap[item] || 'black',
                    fontSize: selectedValue === item ? '1rem' : '0.875rem',
                    boxShadow: selectedValue === item ? '0px 0px 6px rgba(0, 0, 0, 0.3)' : 'none',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                        backgroundColor: selectedValue === item ? colorMap[item] : 'transparent',
                        borderColor: colorMap[item] || '#ccc',
                    },
                }}
            />
        ));
    };

    return (
        <div>
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
                        width: 600,
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
                        עריכת פרטי לקוחה
                    </Typography>

                    {error && <Alert severity="error">{error}</Alert>}

                    <TextField
                        fullWidth
                        label="שם פרטי"
                        margin="normal"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />

                    <TextField
                        fullWidth
                        label="שם משפחה"
                        margin="normal"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />

                    <TextField
                        fullWidth
                        label="אימייל"
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <TextField
                        fullWidth
                        label="טלפון"
                        margin="normal"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        value={birthDate ? birthDate.slice(0, 10) : ''}
                        type="date"
                        onChange={(e) => setBirthDate(e.target.value)}
                    />

                    <Typography>סוג עור</Typography>
                    <Box>
                        {renderChipSelection(skinTypes, skinType, 'skin_type', {
                            רגיל: skinTypeColor,
                            "יבש וחסר לחות": skinTypeColor,
                            שמן: skinTypeColor,
                            בעייתי: skinTypeColor,
                            מעורב: skinTypeColor,
                        })}
                    </Box>

                    <Typography>סטטוס</Typography>
                    <Box>
                        {renderChipSelection(statuses, treatmentStatus, 'treatment_status', statusColors)}
                    </Box>

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
                                העלאת תמונת פרופיל
                            </Button>
                        </label>
                    </Box>

                    {imageUrl && (
                        <Box sx={{ textAlign: "center", my: 2 }}>
                            <img
                                src={imageUrl}
                                alt="תמונת פרופיל ללקוח"
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
                            onClick={handleSaveEditDetails}
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
        </div>
    );
}
