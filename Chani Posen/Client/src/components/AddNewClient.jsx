import React, { useState, useRef, useEffect } from 'react';
import Tooltip from '@mui/material/Tooltip';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import Modal from '@mui/material/Modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
    Box,
    Button,
    TextField,
    Alert,
    Typography,
    IconButton
} from "@mui/material";
import { serverRequests } from "../Api";
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';



const AddNewClient = ({ addClientToList, userData }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        birthDate: '',
        treatmentStatus: '',
        skinType: '',
        imagePath: ''
    });
    const [errors, setErrors] = useState("");
    const [image, setImage] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
    const modalRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                setErrors("יש לבחור קובץ תמונה תקין");
                return;
            }
            setErrors("");
            setImage(file);
            setImageUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
        setImageUrl("");
    };

    const validateForm = () => {
        if (!formData.firstName.trim()) return 'שם פרטי הוא שדה חובה';
        if (!formData.lastName.trim()) return 'שם משפחה הוא שדה חובה';
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            return 'אימייל לא תקין';
        }
        if (formData.phone && !/^\d{9,15}$/.test(formData.phone)) {
            return 'מספר טלפון לא תקין';
        }
        if (!formData.birthDate || isNaN(new Date(formData.birthDate)))
            return "תאריך לידה לא תקין";
        if ((new Date().getFullYear() - new Date(formData.birthDate).getFullYear()) < 10)
            return "הלקוחה צעירה מידיי";
        if ((new Date().getFullYear() - new Date(formData.birthDate).getFullYear()) > 100)
            return "הלקוחה מבוגרת מידיי";
        if (!formData.treatmentStatus) return 'סטטוס טיפול הוא שדה חובה';
        if (!formData.skinType) return 'סוג עור הוא שדה חובה';
        if (!image) return "חובה להעלות תמונת פרופיל";
        return null;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleCloseModal = () => {
        setModalOpen(false)
        setErrors("");
    };

    useEffect(() => {
        if (errors) {
            modalRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [errors]);

    const handleSave = async () => {
        setErrors("");
        const errorMsg = validateForm();
        if (errorMsg) {
            setErrors(errorMsg);
            return;
        }
        setIsSaving(true);
        try {
            const newClient = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                birth_date: formData.birthDate,
                treatment_status: formData.treatmentStatus,
                skin_type: formData.skinType,
            };

            const response = await serverRequests('POST', 'clients', newClient);

            if (!response.ok) {
                toast.error('שגיאה בהוספת לקוח. נסי שוב.');
                return;
            }

            const responseData = await response.json();
            const newClientId = responseData.userId;

            console.log("לקוח נוסף בהצלחה עם מזהה: ", newClientId);

            console.log("details of image ", image, newClientId, userData.user_id)

            if (image) {
                console.log("details of image ", image, newClientId, userData.user_id);

                const formData1 = new FormData();
                formData1.append("image", image);
                formData1.append("user_id", newClientId);
                formData1.append("image_type", "profile");
                formData1.append("description", `תמונת פרופיל של לקוח ${newClientId}`);

                const uploadResponse = await serverRequests("POST", `uploads/${userData.user_id}`, formData1);

                if (!uploadResponse.ok) {
                    throw new Error("Failed to upload profile image");
                }

                const imageData = await uploadResponse.json();

                const savedClient = {
                    ...newClient,
                    profile_image: imageData.imagePath
                };

                addClientToList({ ...savedClient, user_id: newClientId });
            }

            toast.success(`לקוח נוסף בהצלחה: ${formData.firstName} ${formData.lastName}`);
            setModalOpen(false);
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                birthDate: '',
                treatmentStatus: '',
                skinType: '',
                imagePath: ''
            });

        } catch (error) {
            console.error('Error adding client:', error);
            toast.error('שגיאה בהוספת לקוח. נסי שוב.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <ToastContainer
                position="top-center"
                reverseOrder={false}
            />
            <Tooltip title="הוסיפי לקוחה חדשה" arrow>
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={() => setModalOpen(true)}
                    sx={{
                        backgroundColor: '#B68FFF',
                        color: '#fff',
                        '&:hover': { backgroundColor: '#A256E8' },
                        order: { xs: 1, sm: 0 },
                    }}
                >
                    <AddIcon />
                </Fab>
            </Tooltip>

            <Modal open={isModalOpen} onClose={() => setModalOpen(false)}>

                <Box
                    ref={modalRef}
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 500,
                        maxHeight: "80vh",
                        bgcolor: "background.paper",
                        boxShadow: 24,
                        p: 4,
                        borderRadius: "8px",
                        overflow: "auto",
                    }}
                >
                    <IconButton
                        onClick={handleCloseModal}
                        disabled={isSaving}
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
                        הוספת לקוחה חדשה
                    </Typography>
                    {errors && <Alert severity="error">{errors}</Alert>}
                    <TextField
                        fullWidth
                        label="שם פרטי"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        error={!!errors.firstName}
                        helperText={errors.firstName}
                        margin="normal"
                        disabled={isSaving}
                    />
                    <TextField
                        fullWidth
                        label="שם משפחה"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        error={!!errors.lastName}
                        helperText={errors.lastName}
                        margin="normal"
                        disabled={isSaving}
                    />
                    <TextField
                        fullWidth
                        label="אימייל"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        error={!!errors.email}
                        helperText={errors.email}
                        margin="normal"
                        disabled={isSaving}
                    />
                    <TextField
                        fullWidth
                        label="טלפון"
                        name="phone"
                        value={formData.phone}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) {
                                handleInputChange(e);
                            }
                        }}
                        error={!!errors.phone}
                        helperText={errors.phone}
                        margin="normal"
                        inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                        disabled={isSaving}
                    />
                    <TextField
                        fullWidth
                        label="תאריך לידה"
                        name="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                        error={!!errors.birthDate}
                        helperText={errors.birthDate}
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        disabled={isSaving}
                    />
                    <TextField
                        fullWidth
                        select
                        label="סטטוס טיפול"
                        name="treatmentStatus"
                        value={formData.treatmentStatus}
                        onChange={handleInputChange}
                        error={!!errors.treatmentStatus}
                        helperText={errors.treatmentStatus}
                        margin="normal"
                        SelectProps={{
                            native: true,
                        }}
                        disabled={isSaving}
                    >
                        <option value="">בחר סטטוס טיפול</option>
                        <option value="שלב 1 - איבחון">שלב 1 - איבחון</option>
                        <option value="שלב 2 - אסטרטגיה">שלב 2 - אסטרטגיה</option>
                        <option value="שלב 3 - טיפול בקליניקה">שלב 3 - טיפול בקליניקה</option>
                        <option value="שלב 4 - התמדה ומעקב">שלב 4 - התמדה ומעקב</option>
                        <option value="עדיין לא פנתה לקבלת שירות">עדיין לא פנתה לקבלת שירות</option>
                    </TextField>
                    <TextField
                        fullWidth
                        select
                        label="סוג עור"
                        name="skinType"
                        value={formData.skinType}
                        onChange={handleInputChange}
                        error={!!errors.skinType}
                        helperText={errors.skinType}
                        margin="normal"
                        SelectProps={{
                            native: true,
                        }}
                        disabled={isSaving}
                    >
                        <option value="">בחר סוג עור</option>
                        <option value="רגיל">רגיל</option>
                        <option value="יבש וחסר לחות">יבש וחסר לחות</option>
                        <option value="שמן">שמן</option>
                        <option value="בעייתי">בעייתי</option>
                        <option value="מעורב">מעורב</option>
                    </TextField>

                    <Box sx={{ textAlign: "center", my: 2 }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: "none" }}
                            id="image-upload"
                        />
                        <label htmlFor="image-upload">
                            <Button variant="contained" component="span" disabled={isSaving}>
                                העלאת תמונת פרופיל
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
                            <Button color="error" onClick={handleRemoveImage} sx={{ mt: 1 }} disabled={isSaving}>
                                מחיקת תמונה
                            </Button>
                        </Box>
                    )}

                    <Box sx={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                        <Button variant="contained" color="primary" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <CircularProgress size={24} color="inherit" /> : "הוספה"}
                        </Button>

                        <Button variant="outlined" onClick={handleCloseModal} disabled={isSaving}>
                            ביטול
                        </Button>
                    </Box>

                </Box>

            </Modal>
        </div>
    );
};

export default AddNewClient;
