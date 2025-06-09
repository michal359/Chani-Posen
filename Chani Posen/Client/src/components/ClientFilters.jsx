import React, { useState } from 'react';
import {
    Box, Button, MenuItem, FormControl, InputLabel, Select, Typography, CircularProgress, IconButton, Backdrop
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { serverRequests } from '../Api';

export default function ClientFilters({ filters, setFilters, onClose }) {
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (filters.status) query.append('status', filters.status);
            if (filters.skin) query.append('skin', filters.skin);
            if (filters.birthMonth) query.append('birthMonth', filters.birthMonth);

            const response = await serverRequests('GET', `clients?${query.toString()}`);
            const data = await response.json();
            const event = new CustomEvent('filteredClients', { detail: data.clients });
            window.dispatchEvent(event);
            onClose();
        } catch (error) {
            console.error('שגיאה בסינון:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Backdrop open sx={{ zIndex: 1200, color: '#fff' }}>
            <Box
                sx={{
                    bgcolor: 'white',
                    color: 'black',
                    borderRadius: 2,
                    boxShadow: 5,
                    p: 3,
                    width: '90%',
                    maxWidth: '400px',
                    position: 'relative',
                    textAlign: 'center'
                }}
            >
                <IconButton
                    onClick={onClose}
                    disabled={loading}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        color: '#999'
                    }}
                >
                    <CloseIcon />
                </IconButton>

                <Typography variant="h6" mb={2}>סינון לקוחות</Typography>

                <FormControl fullWidth sx={{ mb: 2 }} disabled={loading}>
                    <InputLabel>סטטוס טיפול</InputLabel>
                    <Select
                        value={filters.status || ''}
                        label="סטטוס טיפול"
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                        <MenuItem value="">הצג הכל</MenuItem>
                        <MenuItem value="שלב 1 - איבחון">שלב 1 - איבחון</MenuItem>
                        <MenuItem value="שלב 2 - אסטרטגיה">שלב 2 - אסטרטגיה</MenuItem>
                        <MenuItem value="שלב 3 - טיפול בקליניקה">שלב 3 - טיפול בקליניקה</MenuItem>
                        <MenuItem value="שלב 4 - התמדה ומעקב">שלב 4 - התמדה ומעקב</MenuItem>
                        <MenuItem value="עדיין לא פנתה לקבלת שירות">עדיין לא פנתה לקבלת שירות</MenuItem>
                    </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }} disabled={loading}>
                    <InputLabel>סוג עור</InputLabel>
                    <Select
                        value={filters.skin || ''}
                        label="סוג עור"
                        onChange={(e) => setFilters(prev => ({ ...prev, skin: e.target.value }))}
                    >
                        <MenuItem value="">הצג הכל</MenuItem>
                        <MenuItem value="רגיל">רגיל</MenuItem>
                        <MenuItem value="יבש וחסר לחות">יבש וחסר לחות</MenuItem>
                        <MenuItem value="שמן">שמן</MenuItem>
                        <MenuItem value="בעייתי">בעייתי</MenuItem>
                        <MenuItem value="מעורב">מעורב</MenuItem>
                    </Select>
                </FormControl>
                
                <FormControl fullWidth sx={{ mb: 2 }} disabled={loading}>
                    <InputLabel>חודש יום הולדת</InputLabel>
                    <Select
                        value={filters.birthMonth || ''}
                        label="חודש יום הולדת"
                        onChange={(e) => setFilters(prev => ({ ...prev, birthMonth: e.target.value }))}
                    >
                        <MenuItem value="">הצג הכל</MenuItem>
                        {[
                            "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
                            "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
                        ].map((monthName, index) => (
                            <MenuItem key={index + 1} value={index + 1}>{monthName}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 2,
                        mt: 2
                    }}
                >
                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => {
                            setFilters({});
                            const event = new CustomEvent('filteredClients', { detail: null });
                            window.dispatchEvent(event);
                            onClose();
                        }}

                        disabled={loading}
                        sx={{
                            color: '#666',
                            borderColor: '#ccc',
                            backgroundColor: '#f5f5f5',
                            '&:hover': {
                                backgroundColor: '#e0e0e0',
                                borderColor: '#bbb'
                            }
                        }}
                    >
                        ביטול
                    </Button>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleSearch}
                        disabled={loading}
                        sx={{
                            backgroundColor: '#B68FFF',
                            '&:hover': { backgroundColor: '#A256E8' }
                        }}
                    >
                        {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'חיפוש'}
                    </Button>
                </Box>

            </Box>
        </Backdrop>
    );
}
