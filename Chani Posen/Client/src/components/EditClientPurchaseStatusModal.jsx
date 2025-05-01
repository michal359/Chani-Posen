import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Typography,
    Modal,
    Chip,
    MenuItem,
    Select,
    IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { serverRequests } from '../Api';

export default function EditClientPurchaseStatusModal({ open, onClose, purchase, purchases, setPurchases, onSuccess, onError }) {
    const [status, setStatus] = useState(purchase?.status || "Unpaid");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setStatus(purchase?.status || "Unpaid");
    }, [purchase]);

    const handleUpdateStatus = () => {
        setLoading(true);
        console.log('Updating purchase status with:', status)
        serverRequests('PUT', `purchases/${purchase.purchase_id}`, { status })
            .then(response => response.json())
            .then(data => {
                if (data) {
                    onSuccess("סטטוס הרכישה התעדכן בהצלחה!")
                    setPurchases(purchases.map(p =>
                        p.purchase_id === purchase.purchase_id ? { ...p, status } : p
                    ));
                    onClose();
                }
            })
            .catch(error => {
                onError("יש שגיאה בעידכון סטטוס הרכישה")
                console.error('Error:', error);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <Modal open={open} onClose={() => onClose(false)}>
            <Box
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 350,
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2,
                    position: "relative"
                }}
            >
                <IconButton
                    sx={{ position: "absolute", top: 6, left: 6 }}
                    onClick={() => onClose(false)}
                >
                    <CloseIcon />
                </IconButton>

                <Typography variant="h6">עריכת סטטוס רכישה</Typography>

                <Box display="flex" alignItems="center" mt={2}>
                    <Typography>סטטוס נוכחי:</Typography>
                    <Box sx={{ width: 10 }} />
                    <Chip
                        label={status === "Paid" ? "שולם" : "לא שולם"}
                        color={status === "Paid" ? "success" : "error"}
                        variant="outlined"
                        sx={{
                            borderRadius: '16px',
                            padding: '4px 10px',
                        }}
                    />
                </Box>

                <Select
                    fullWidth
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    sx={{ mt: 2 }}
                >
                    <MenuItem value="Paid">שולם</MenuItem>
                    <MenuItem value="Unpaid">לא שולם</MenuItem>
                </Select>

                <Button
                    variant="contained"
                    fullWidth
                    onClick={handleUpdateStatus}
                    disabled={loading}
                    sx={{
                        mt: 2,
                        backgroundColor: '#B68FFF',
                        color: '#fff',
                        '&:hover': {
                            backgroundColor: '#A256E8',
                        }
                    }}
                >
                    {loading ? "מעדכן..." : "אישור"}
                </Button>

            </Box>
        </Modal>
    );
}
