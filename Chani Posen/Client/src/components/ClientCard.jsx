import React from 'react';
import PropTypes from 'prop-types';
import { Avatar, Box, Typography, Stack, Chip } from '@mui/material';
import { Email, Phone, Cake } from '@mui/icons-material';

export default function ClientCard({
    firstName = 'Unknown',
    lastName = 'Unknown',
    email = 'Not provided',
    phone = 'Not provided',
    birthday = null,
    status = 'Unknown',
    profileImage = null,
    skinType = 'Not specified',
    onClick,
}) {
    const statusColors = {
        "שלב 1 - איבחון": "#AEE5FF",
        "שלב 2 - אסטרטגיה": "#B68FFF",
        "שלב 3 - טיפול בקליניקה": "#FFD966",
        "שלב 4 - התמדה ומעקב": "#66FF66",
        "עדיין לא פנתה לקבלת שירות": "#FF85C1",
    };

    const skinTypeColor = "#B68FFF";

    const calculateAge = (birthdate) => {
        if (!birthdate) return 'Unknown';
        const birthDate = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <Box
            onClick={onClick}
            sx={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                width: '280px',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#fff',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                    transform: 'scale(1.03)',
                    boxShadow: '0 6px 10px rgba(0, 0, 0, 0.2)',
                },
            }}
        >
            {/* תמונת פרופיל */}
            <Avatar
                src={profileImage}
                alt={`${firstName} ${lastName}`}
                sx={{
                    width: 100,
                    height: 100,
                    marginBottom: '10px',
                }}
            />

            {/* שם */}
            <Typography
                variant="h6"
                sx={{
                    marginBottom: '10px',
                    fontWeight: 'bold',
                    color: '#333',
                }}
            >
                {firstName} {lastName}
            </Typography>

            {/* פרטי לקוח */}
            <Stack spacing={1} sx={{ width: '100%', textAlign: 'center', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Email sx={{ fontSize: '1.2rem' }} />
                    {email}
                </Typography>
                <Typography sx={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Phone sx={{ fontSize: '1.2rem' }} />
                    {phone}
                </Typography>
                <Typography sx={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Cake sx={{ fontSize: '1.2rem' }} />
                    {birthday ? `בת ${calculateAge(birthday)}` : 'לא זמין'}
                </Typography>
            </Stack>

            <Stack
                direction="column" // שינוי לכיוון אנכי
                spacing={1} // ריווח בין הצ'יפים
                sx={{
                    marginTop: '15px',
                    alignItems: 'center', // ממורכז אופקית
                }}
            >
                <Chip
                    label={status || 'לא זמין'}
                    sx={{
                        backgroundColor: statusColors[status] || '#ddd',
                        color: '#fff',
                        fontWeight: 'bold',
                        border: `2px solid ${statusColors[status] || '#ccc'}`,
                    }}
                />
                <Chip
                    label={`עור ${skinType}`}
                    sx={{
                        backgroundColor: skinTypeColor,
                        color: '#fff',
                        fontWeight: 'bold',
                        border: `2px solid ${skinTypeColor}`,
                    }}
                />
            </Stack>

        </Box>
    );
}

ClientCard.propTypes = {
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    birthday: PropTypes.string,
    status: PropTypes.string,
    profileImage: PropTypes.string,
    skinType: PropTypes.string,
    joinDate: PropTypes.string,
    onClick: PropTypes.func,
};
