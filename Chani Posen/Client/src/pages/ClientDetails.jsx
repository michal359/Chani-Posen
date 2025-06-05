import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serverRequests } from '../Api';
import {
    Box,
    Avatar,
    Typography,
    Tabs,
    Tab,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
} from '@mui/material';
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import ClientPersonalDetails from '../components/ClientPersonalDetails';
import ClientTreatments from '../components/ClientTreatments';
import ClientProducts from '../components/ClientProducts';
import ClientImages from '../components/ClientImages';
import EditClientDetailsModal from '../components/EditClientDetailsModal';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { ToastContainer, toast } from 'react-toastify';
import { useLocation, Outlet, Link } from 'react-router-dom';


const theme = createTheme({
    direction: 'rtl',
    typography: {
        fontFamily: 'Arial, sans-serif',
    },
});

const cacheRtl = createCache({
    key: 'muirtl',
    stylisPlugins: [rtlPlugin],
});

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


export default function ClientDetails({ userData }) {

    const navigate = useNavigate();
    const { clientId } = useParams();
    const [clientData, setClientData] = useState(null);
    // const [tabValue, setTabValue] = useState('personal');
    const [openEdit, setOpenEdit] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const location = useLocation();
    const validTabs = ['personal', 'treatments', 'products', 'images'];
    const currentTab = location.pathname.split('/').pop();
    const tabValue = validTabs.includes(currentTab) ? currentTab : false;

    useEffect(() => {
        const url = `clients/${clientId}`;
        serverRequests('GET', url, null)
            .then(response => {
                if (!response.ok) {
                    console.error('Failed to fetch client');
                    return;
                }
                return response.json();
            })
            .then(data => {
                const clientsData = data?.clients[0];
                setClientData(clientsData);
            })
            .catch(error => {
                console.error('Error fetching client:', error);
            });
    }, [clientId]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    if (!clientData) {
        return <div>Loading...</div>;
    }

    const renderTabContent = () => {
        switch (tabValue) {
            case 'personal':
                return <ClientPersonalDetails personalDetails={clientData} />;
            case 'treatments':
                return <ClientTreatments clientId={clientId} />;
            case 'products':
                return <ClientProducts clientId={clientId} />;
            case 'images':
                return <ClientImages clientId={clientId} userData={userData} />;
            default:
                return null;
        }
    };

    const handleGoBackToClientsClick = () => {
        navigate(`/admin-home/clients`);
    };


    const handleDeleteClient = () => {
        serverRequests('DELETE', `clients/${clientId}`)
            .then(response => {
                if (response.ok) {
                    onSuccess('הלקוחה נמחקה בהצלחה')
                    setOpenDeleteDialog(false);
                    setTimeout(() => {
                        navigate('/admin-home/clients');
                    }, 2000);
                } else {
                    onError('מחיקת הלקוחה נכשלה, נסי שוב')
                    console.error('מחיקת לקוחה נכשלה');
                }
            })
            .catch(error => {
                console.error('שגיאה במחיקת לקוחה:', error);
            });

    };

    const onSuccess = (message) => {
        toast.success(message);
    };

    const onError = (message) => {
        toast.error(message);
    };

    return (
        <CacheProvider value={cacheRtl}>
            <ToastContainer
                position="top-center"
                reverseOrder={false}
            />
            <ThemeProvider theme={theme}>
                <Box sx={{ textAlign: 'right', width: '100vw' }}>
                    <Box
                        sx={{
                            height: 200,
                            margin: '-40px auto 0',
                            width: '100vw',
                            backgroundImage: 'url(https://cdn.leonardo.ai/users/e259bcb5-dde9-4c23-83bd-11b3ab60662c/generations/f4686a43-d99d-47be-b89a-7367e5527844/segments/1:4:1/Flux_Dev_Create_a_soft_elegant_background_image_for_a_client_p_0.jpg)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />
                    <Box
                        sx={{
                            margin: '-60px auto 0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <Avatar
                            src={clientData.profile_image}
                            sx={{
                                width: 120,
                                height: 120,
                                border: '4px solid white',
                            }}
                        />

                        <Tooltip title="חזרה לכל הלקוחות" arrow>
                            <Fab
                                color="secondary"
                                aria-label="back"
                                sx={{
                                    position: 'fixed',
                                    left: 'auto',
                                    right: 25,
                                    top: 120,
                                    backgroundColor: '#B68FFF',
                                    '&:hover': {
                                        backgroundColor: '#A256E8',
                                    },
                                }}
                                onClick={handleGoBackToClientsClick}
                            >
                                <ArrowBackIcon />
                            </Fab>
                        </Tooltip>

                        <Typography variant="h4" fontWeight="bold" align="center">
                            {clientData.first_name} {clientData.last_name}
                        </Typography>
                    </Box>

                    <SpeedDial
                        ariaLabel="פעולות לקוח"
                        sx={{
                            position: 'fixed',
                            right: 25,
                            top: 190,
                            '& .MuiSpeedDial-fab': {
                                backgroundColor: '#B68FFF',
                                '&:hover': {
                                    backgroundColor: '#A256E8',
                                },
                            },
                        }}
                        icon={<SpeedDialIcon />}
                        direction="down"
                    >
                        <SpeedDialAction
                            icon={<EditIcon />}
                            tooltipTitle="עריכת פרטי לקוחה"
                            onClick={() => setOpenEdit(true)}
                        />
                        <SpeedDialAction
                            icon={<DeleteIcon />}
                            tooltipTitle="מחיקת לקוחה"
                            onClick={() => setOpenDeleteDialog(true)}
                        />
                    </SpeedDial>

                    {openEdit && <EditClientDetailsModal clientData={clientData} setClientData={setClientData} onClose={() => setOpenEdit(false)} userId={userData.user_id} onError={onError} onSuccess={onSuccess} />}

                    <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                        <DialogContent>
                            <p>האם אתה בטוח שברצונך למחוק את הלקוחה <b>"{clientData.first_name} {clientData.last_name}"</b>?</p>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
                                ביטול
                            </Button>
                            <Button onClick={handleDeleteClient} color="error">
                                מחיקה
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Box mt={3}>
                        <Tabs
                            value={tabValue}
                            textColor="secondary"
                            indicatorColor="secondary"
                            aria-label="client details tabs"
                            centered
                            sx={{
                                "& .MuiTabs-indicator": {
                                    backgroundColor: "#A256E8",
                                },
                                "& .MuiTab-root": {
                                    color: "#A256E8",
                                    "&.Mui-selected": {
                                        color: "#A256E8",
                                        fontWeight: "bold",
                                    },
                                },
                            }}
                        >
                            <Tab value="personal" label="פרטים אישיים" component={Link} to={`/admin-home/clients/${clientId}/personal`} />
                            <Tab value="treatments" label="טיפולים" component={Link} to={`/admin-home/clients/${clientId}/treatments`} />
                            <Tab value="products" label="מוצרים" component={Link} to={`/admin-home/clients/${clientId}/products`} />
                            <Tab value="images" label="תמונות" component={Link} to={`/admin-home/clients/${clientId}/images`} />
                        </Tabs>
                    </Box>

                    <Box mt={2} sx={{ padding: 2, width: '100vw' }}>
                        <Outlet context={{ clientData, clientId, userData }}/>
                    </Box>

                </Box>


            </ThemeProvider>
        </CacheProvider>
    );
}
