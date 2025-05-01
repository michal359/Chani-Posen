import React, { useEffect } from 'react';
import { Typography, Stack, Chip } from '@mui/material';
import { Email, Phone, Face, AccessTime } from '@mui/icons-material';
import { useOutletContext } from 'react-router-dom';

export default function ClientPersonalDetails({ }) {

  const { clientData } = useOutletContext();

  useEffect(() => {
    console.log('Updated clientData:', clientData);
  }, [clientData]);

  if (!clientData) {
    return <Typography>Loading...</Typography>;
  }

  const { birth_date: birthDate, email, phone, treatment_status: treatmentStatus, skin_type: skinType, created_at, username } = clientData;

  const statusColors = {
    "שלב 1 - איבחון": "#AEE5FF",
    "שלב 2 - אסטרטגיה": "#B68FFF",
    "שלב 3 - טיפול בקליניקה": "#FFD966",
    "שלב 4 - התמדה ומעקב": "#66FF66",
    "עדיין לא פנתה לקבלת שירות": "#FF85C1",
  };


  const skinTypeColor = "#B68FFF";

  const calculateAge = (birthDate) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDifference = today.getMonth() - birth.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  return (
    <Stack spacing={2} sx={{ textAlign: 'center' }}>
      <Typography>
        <Email sx={{ fontSize: 20, verticalAlign: 'middle' }} /> {email || 'לא זמין'}
      </Typography>
      <Typography>
        <Phone sx={{ fontSize: 20, verticalAlign: 'middle' }} /> {phone || 'לא זמין'}
      </Typography>
      <Typography>
        <Face sx={{ fontSize: 20, verticalAlign: 'middle' }} /> בת {birthDate ? calculateAge(birthDate) : 'לא זמין'}
      </Typography>
      <Typography>
        <strong>שם משתמש:</strong> {username || 'לא זמין'}
      </Typography>

      <Stack direction="row" justifyContent="center">
        <Chip
          label={treatmentStatus || 'לא זמין'}
          sx={{
            margin: '0 10px',
            backgroundColor: statusColors[treatmentStatus] || 'transparent',
            border: `2px solid ${statusColors[treatmentStatus] || '#ccc'}`,
            color: treatmentStatus ? 'white' : 'black',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            boxShadow: treatmentStatus ? '0px 0px 6px rgba(0, 0, 0, 0.3)' : 'none',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              backgroundColor: statusColors[treatmentStatus] || 'transparent',
              borderColor: statusColors[treatmentStatus] || '#ccc',
            },
          }}
        />
        <Chip
          label={` עור ${skinType}` || 'לא זמין'}
          sx={{
            margin: '0 10px',
            backgroundColor: skinTypeColor,
            border: `2px solid ${skinTypeColor}`,
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            boxShadow: '0px 0px 6px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              backgroundColor: skinTypeColor,
              borderColor: skinTypeColor,
            },
          }}
        />
      </Stack>
      <Typography>
        <AccessTime sx={{ fontSize: 20, verticalAlign: 'middle' }} /> <strong>הלקוחה הצטרפה בתאריך: </strong>
        {created_at ? new Date(created_at).toLocaleString('he-IL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : 'לא זמין'}
      </Typography>
    </Stack>
  );
}
