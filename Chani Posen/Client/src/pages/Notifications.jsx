import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverRequests } from '../Api';
import {
    Box, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Stack
} from "@mui/material";
import { ToastContainer } from 'react-toastify';
import '../css/loadingPoints.css';

const notificationLabels = {
    SYSTEM: "מערכת",
    FINANCIAL: "פיננסי",
    TREATMENT: "טיפול",
    PRODUCT: "מוצר",
    PERSONAL: "אישי",
    OTHER: "אחר"
};

const notificationColors = {
    SYSTEM: "#FFB74D",     // כתום בהיר
    FINANCIAL: "#81C784",  // ירוק בהיר
    TREATMENT: "#90CAF9",  // כחול בהיר
    PRODUCT: "#F48FB1",    // ורוד בהיר
    PERSONAL: "#CE93D8"    // סגול בהיר
};

export default function Notifications({ userData }) {
    const [allNotifications, setAllNotifications] = useState(null);
    const [filterType, setFilterType] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const url = `notifications/${userData.user_id}`;
        serverRequests('GET', url, null)
            .then(response => {
                if (!response.ok) {
                    console.error('Failed to fetch notifications');
                    return;
                }
                return response.json();
            })
            .then(data => {
                if (data && data.notifications) {
                    // סידור לפי תאריך יורד (חדשות למעלה)
                    const sorted = [...data.notifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    setAllNotifications(sorted);
                }
            })
            .catch(error => {
                console.error('Error fetching notifications:', error);
            });
    }, [userData?.user_id]);

    const filteredNotifications = allNotifications
        ? filterType === null
            ? allNotifications
            : allNotifications.filter(n =>
                filterType === 'OTHER'
                    ? !notificationColors.hasOwnProperty(n.notification_type)
                    : n.notification_type === filterType
            )
        : [];

    if (!allNotifications) {
        return (
            <div style={{ textAlign: 'center', direction: 'rtl' }}>
                <p>טוען נתונים...</p>
            </div>
        );
    }

    return (
        <div style={{ paddingTop: '20px', textAlign: 'right', direction: 'rtl' }}>
            <ToastContainer position="top-center" reverseOrder={false} />
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ mb: 4 }}>
                {Object.keys(notificationColors).map((type) => (
                    <Chip
                        key={type}
                        label={notificationLabels[type] || type}
                        clickable
                        onClick={() => setFilterType(type)}
                        style={{
                            backgroundColor: filterType === type ? notificationColors[type] : "white",
                            color: filterType === type ? "white" : notificationColors[type],
                            border: `1px solid ${notificationColors[type]}`,
                            fontWeight: "bold",
                            margin: "5px"
                        }}
                    />
                ))}

                <Chip
                    label={notificationLabels.OTHER}
                    clickable
                    onClick={() => setFilterType("OTHER")}
                    style={{
                        backgroundColor: filterType === "OTHER" ? "#9e9e9e" : "white",
                        color: filterType === "OTHER" ? "white" : "#9e9e9e",
                        border: "1px solid #9e9e9e",
                        fontWeight: "bold",
                        margin: "5px"
                    }}
                />
                <Chip
                    label="הצג הכל"
                    clickable
                    onClick={() => setFilterType(null)}
                    style={{
                        backgroundColor: filterType === null ? "#1976d2" : "white",
                        color: filterType === null ? "white" : "#1976d2",
                        border: "1px solid #1976d2",
                        fontWeight: "bold",
                        margin: "5px"
                    }}
                />

            </Stack>

            {/* טבלה */}
            {filteredNotifications.length === 0 ? (
                <p style={{ textAlign: "center", fontSize: "18px", color: "#888" }}>
                    אין התראות להצגה
                </p>
            ) : (
                <Box sx={{ maxWidth: "100%", overflowX: "auto", paddingInline: 1 }}>
                    <TableContainer component={Paper} sx={{ minWidth: 0, maxWidth: "900px", margin: "auto" }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell align="right"><strong>סוג</strong></TableCell>
                                    <TableCell align="right"><strong>תוכן</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredNotifications.map((notification, index) => {
                                    const color = notificationColors[notification.notification_type] || "#BDBDBD";
                                    return (
                                        <TableRow
                                            key={index}
                                            style={{
                                                backgroundColor: notification.is_read ? "white" : "#f9f9f9",
                                                fontWeight: notification.is_read ? "normal" : "bold",
                                                transition: "transform 0.2s",
                                                cursor: "pointer"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = "scale(1.01)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = "scale(1)";
                                            }}
                                        >
                                            <TableCell align="right">
                                                <Chip
                                                    label={notificationLabels[notification.notification_type] || notificationLabels.OTHER}
                                                    style={{
                                                        backgroundColor: color,
                                                        color: "#FFF",
                                                        fontWeight: "bold"
                                                    }}
                                                />

                                            </TableCell>
                                            <TableCell align="right" style={{ color: "#333" }}>
                                                {notification.notification_text}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}
        </div>
    );
}
