import React from 'react';
import PropTypes from 'prop-types';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Avatar, Chip } from '@mui/material';

export default function ClientTable({ clients, onRowClick }) {
    const statusColors = {
        "שלב 1 - איבחון": "#AEE5FF",
        "שלב 2 - אסטרטגיה": "#B68FFF",
        "שלב 3 - טיפול בקליניקה": "#FFD966",
        "שלב 4 - התמדה ומעקב": "#66FF66",
        "עדיין לא פנתה לקבלת שירות": "#FF85C1",
    };

    const skinTypeColor = "#B68FFF";

    return (
        <TableContainer component={Paper} dir="rtl">
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell align="right">תמונה</TableCell>
                        <TableCell align="right">שם</TableCell>
                        <TableCell align="right">אימייל</TableCell>
                        <TableCell align="right">טלפון</TableCell>
                        <TableCell align="right">גיל</TableCell>
                        <TableCell align="right">סטטוס</TableCell>
                        <TableCell align="right">סוג עור</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {clients.map(client => (
                        <TableRow
                            key={client.user_id}
                            hover
                            onClick={() => onRowClick(client.user_id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <TableCell align="right">
                                <Avatar src={client.profile_image}/>
                            </TableCell>
                            <TableCell align="right">{`${client.first_name} ${client.last_name}`}</TableCell>
                            <TableCell align="right">{client.email}</TableCell>
                            <TableCell align="right">{client.phone}</TableCell>
                            <TableCell align="right">{calculateAge(client.birth_date)} {client.birth_date}</TableCell>
                            <TableCell align="right">
                                <Chip
                                    label={client.treatment_status || 'לא זמין'}
                                    sx={{
                                        backgroundColor: 'transparent',
                                        color: 'black',
                                        border: `2px solid ${statusColors[client.treatment_status] || '#ccc'}`,
                                    }}
                                />
                            </TableCell>
                            <TableCell align="right">
                                <Chip
                                    label={`עור ${client.skin_type}`}
                                    sx={{
                                        backgroundColor: 'transparent',
                                        color: 'black',
                                        border: `2px solid ${skinTypeColor}`,
                                    }}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>

            </Table>
        </TableContainer>
    );
}

function calculateAge(birthdate) {
    if (!birthdate) return 'Unknown';
    const birthDate = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

ClientTable.propTypes = {
    clients: PropTypes.array.isRequired,
    onRowClick: PropTypes.func.isRequired,
};
