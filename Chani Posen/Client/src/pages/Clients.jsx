import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverRequests } from '../Api';
import ClientCard from '../components/ClientCard';
import ClientTable from '../components/ClientTable';
import AddNewClient from '../components/AddNewClient';
import {
    Box, Button, Select, MenuItem, Typography, Grid
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import TextField from "@mui/material/TextField";
import { ViewList, GridView } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';
import '../css/loadingPoints.css';

const rtlTheme = createTheme({
    direction: 'rtl',
    typography: {
        fontFamily: 'Arial, sans-serif',
    },
});

export default function Clients({ userData }) {
    const [allClients, setAllClients] = useState(null);
    const [filteredClients, setFilteredClients] = useState(null);
    const [showBirthdays, setShowBirthdays] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSkinType, setSelectedSkinType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [viewMode, setViewMode] = useState('table');
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const clientsPerPage = 8;


    const navigate = useNavigate();
    const loaderRef = useRef(null);

    const loadMoreClients = async () => {
        if (loading || !hasMore) return;
        setLoading(true);
console.log("📦 page", page);

        try {
            const url = `clients?page=${page}&limit=${clientsPerPage}`;
            const response = await serverRequests('GET', url, null);

            if (!response.ok) {
                console.error('Failed to fetch clients');
                return;
            }

            const data = await response.json();
            if (data?.clients?.length > 0) {
                const sorted = [...clients, ...data.clients].sort((a, b) =>
                    a.first_name.localeCompare(b.first_name, 'he')
                );
                setAllClients(sorted);
                setClients(sorted);

                if (!searchTerm && !selectedSkinType && !selectedStatus && !showBirthdays) {
                    setFilteredClients(sorted);
                }

                setPage(prev => prev + 1);

                if (data.clients.length < clientsPerPage) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMoreClients();
    }, []);

    useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
        entries => {
            const entry = entries[0];
            if (entry.isIntersecting && hasMore && !loading) {
                console.log("📌 Observed. Loading more...");
                loadMoreClients();
            }
        },
        {
            root: null,
            rootMargin: '100px',
            threshold: 1.0,
        }
    );

    observer.observe(loaderRef.current);

    return () => {
        if (loaderRef.current) {
            observer.unobserve(loaderRef.current);
        }
    };
}, [hasMore, loading]); // שים לב: רק תלות ב-hasMore ו-loading


    useEffect(() => {
        if (!searchTerm && !selectedSkinType && !selectedStatus && !showBirthdays) {
            setFilteredClients(clients);
        }
    }, [clients, searchTerm, selectedSkinType, selectedStatus, showBirthdays]);

    const filterClientsByBirthday = (clients) => {
        const currentMonth = new Date().getMonth() + 1;
        return clients.filter(client => {
            const birthMonth = new Date(client.birth_date).getMonth() + 1;
            return birthMonth === currentMonth;
        });
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        filterClients(term, selectedSkinType, selectedStatus);
    };

    const handleSkinTypeFilter = (skinType) => {
        setSelectedSkinType(skinType);
        filterClients(searchTerm, skinType, selectedStatus);
    };

    const handleStatusFilter = (status) => {
        setSelectedStatus(status);
        filterClients(searchTerm, selectedSkinType, status);
    };

    const filterClients = (term, skinType, status) => {
        if (allClients) {
            const lowercasedTerm = term.toLowerCase();
            const filtered = allClients.filter(client => {
                const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
                const matchesName = fullName.includes(lowercasedTerm);
                const matchesSkinType = skinType === '' || client.skin_type === skinType;
                const matchesStatus = status === '' || client.treatment_status === status;
                return matchesName && matchesSkinType && matchesStatus;
            });

            setFilteredClients(filtered);
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedSkinType('');
        setSelectedStatus('');
        setShowBirthdays(false);
        setClients([]);
        setFilteredClients([]);
        setAllClients([]);
        setPage(1);
        setHasMore(true);

        setTimeout(() => {
            loadMoreClients();
        }, 100);
    };

    const displayedClients = showBirthdays
        ? filterClientsByBirthday(filteredClients || [])
        : (filteredClients || []);

    const skinTypes = [
        { label: 'הכל', value: '' },
        { label: 'רגיל', value: 'רגיל' },
        { label: 'יבש וחסר לחות', value: 'יבש וחסר לחות' },
        { label: 'שמן', value: 'שמן' },
        { label: 'בעייתי', value: 'בעייתי' },
        { label: 'מעורב', value: 'מעורב' }
    ];

    const statuses = [
        { label: 'הכל', value: '' },
        { label: 'שלב 1 - איבחון', value: 'שלב 1 - איבחון' },
        { label: 'שלב 2 - אסטרטגיה', value: 'שלב 2 - אסטרטגיה' },
        { label: 'שלב 3 - טיפול בקליניקה', value: 'שלב 3 - טיפול בקליניקה' },
        { label: 'שלב 4 - התמדה ומעקב', value: 'שלב 4 - התמדה ומעקב' },
        { label: 'עדיין לא פנתה לקבלת שירות', value: 'עדיין לא פנתה לקבלת שירות' }
    ];

    const addClientToList = (newClient) => {
        setAllClients(prev => {
            const updated = [...prev, newClient].sort((a, b) =>
                a.first_name.localeCompare(b.first_name, 'he')
            );
            return updated;
        });

        setFilteredClients(prev => {
            const updated = [...prev, newClient].sort((a, b) =>
                a.first_name.localeCompare(b.first_name, 'he')
            );
            return updated;
        });
    };

    const handleRowClick = (clientId) => {
        navigate(`/admin-home/clients/${clientId}`);
    };


    if (!allClients || allClients.length === 0 && loading)
        return (
            <div style={{ textAlign: 'center' }}>
                <svg className="pl" width="240" height="240" viewBox="0 0 240 240">
                    <circle className="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round"></circle>
                    <circle className="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round"></circle>
                    <circle className="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
                    <circle className="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
                </svg>
                <p>טוען נתונים</p>
            </div>
        );

    return (
        <ThemeProvider theme={rtlTheme}>
            <Box padding={4} dir="rtl">

                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    gap={2}
                    sx={{
                        flexDirection: { xs: 'column', sm: 'row' },
                        marginBottom: '20px'
                    }}
                >
                    <AddNewClient addClientToList={addClientToList} userData={userData} />
                    <TextField
                        label="חיפוש לפי שם"
                        variant="outlined"
                        sx={{
                            width: { xs: '90%', sm: '500px' },
                            transition: 'width 0.3s ease-in-out',
                        }}
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}

                    />
                </Box>

                <Box
                    display="flex"
                    gap={2}
                    justifyContent="center"
                    sx={{
                        flexDirection: { xs: 'column', sm: 'row' },
                        marginBottom: '20px'
                    }}
                    alignItems="center">

                    <Button
                        variant="contained"
                        onClick={clearFilters}
                        sx={{
                            backgroundColor: '#B68FFF',
                            color: '#fff',
                            '&:hover': { backgroundColor: '#A256E8' },
                            minWidth: 200,
                            height: 56
                        }}
                    >
                        <ClearIcon /> נקה את כל החיפושים
                    </Button>
                    {/* כפתור הצגת ימי הולדת */}
                    <Button
                        variant={showBirthdays ? "contained" : "outlined"}
                        onClick={() => setShowBirthdays(!showBirthdays)}
                        sx={{
                            backgroundColor: showBirthdays ? '#A256E8' : '#fff',
                            color: showBirthdays ? '#fff' : '#B68FFF',
                            border: `2px solid ${showBirthdays ? '#A256E8' : '#B68FFF'}`,
                            '&:hover': {
                                backgroundColor: showBirthdays ? '#B68FFF' : '#F5E1FF',
                            },
                            minWidth: 200,
                            height: 56
                        }}
                    >
                        למי יש יומולדת החודש?
                    </Button>



                    <Select
                        fullWidth
                        value={selectedStatus || ''}
                        onChange={(e) => handleStatusFilter(e.target.value)}
                        id="status-select"
                        displayEmpty
                        sx={{
                            textAlign: 'right',
                            backgroundColor: '#fff',
                            width: { xs: '90%', sm: '500px' },
                            minWidth: 200,
                            height: 56,
                            border: '2px solid #B68FFF', // מסגרת תמידית סגולה
                            borderRadius: '8px',
                            '&:hover': {
                                border: '2px solid #A256E8', // כהה מעט כשעוברים עם העכבר
                            },
                            '&.Mui-focused': {
                                border: '2px solid #A256E8 !important', // מסגרת כהה יותר כשנבחר
                                boxShadow: '0 0 5px rgba(162, 86, 232, 0.5)', // הוספת הילה עדינה
                            },
                            '&:focus-within': {
                                border: '2px solid #A256E8 !important',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                                border: 'none', // מסיר את המסגרת הדיפולטיבית של MUI
                            },
                        }}
                    >
                        <MenuItem value="" disabled>סנן לפי סטטוס</MenuItem>
                        {statuses.map((status) => (
                            <MenuItem key={status.value} value={status.value}>
                                {status.label}
                            </MenuItem>
                        ))}
                    </Select>

                </Box>

                {/* כפתורי סינון לפי סוג עור */}
                <Box display="flex" gap={1} marginTop={1} flexWrap="wrap" justifyContent="center">
                    {skinTypes.map((type) => (
                        <Button
                            key={type.value}
                            variant={selectedSkinType === type.value ? "contained" : "outlined"}
                            onClick={() => handleSkinTypeFilter(type.value)}
                            sx={{
                                backgroundColor: selectedSkinType === type.value ? '#B68FFF' : 'transparent',
                                color: selectedSkinType === type.value ? '#fff' : '#B68FFF',
                                borderColor: '#B68FFF',
                                '&:hover': { backgroundColor: '#A256E8', color: '#fff' },
                                minWidth: 120,
                                height: 40
                            }}
                        >
                            {type.label === "הכל" ? type.label : `עור ${type.label}`}
                        </Button>
                    ))}
                </Box>
                <br></br>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '20px' }}>
                    <Button
                        onClick={() => setViewMode('table')}
                        title="תצוגת שורות"
                        sx={{
                            minWidth: '50px',
                            height: '50px',
                            borderRadius: '12px',
                            backgroundColor: viewMode === 'table' ? '#9370DB' : '#B68FFF',
                            color: '#fff',
                            '&:hover': {
                                backgroundColor: '#A256E8',
                            },
                            boxShadow: viewMode === 'table' ? '0px 0px 10px #9370DB' : 'none'
                        }}
                    >
                        <ViewList />
                    </Button>
                    <Button
                        onClick={() => setViewMode('cards')}
                        title="תצוגת ריבועים"
                        sx={{
                            minWidth: '50px',
                            height: '50px',
                            borderRadius: '12px',
                            backgroundColor: viewMode === 'cards' ? '#9370DB' : '#B68FFF',
                            color: '#fff',
                            '&:hover': {
                                backgroundColor: '#A256E8',
                            },
                            boxShadow: viewMode === 'cards' ? '0px 0px 10px #9370DB' : 'none'
                        }}
                    >
                        <GridView />
                    </Button>
                </div>

                {displayedClients.length === 0 ? (
                    <Typography variant="h6" align="center" sx={{ mt: 4, color: 'gray' }}>
                        אין תוצאות התואמות לחיפוש שלך
                    </Typography>
                ) : viewMode === 'table' ? (
                    <ClientTable clients={displayedClients} onRowClick={handleRowClick} />
                ) : (
                    <Grid container spacing={3} justifyContent="center" alignItems="stretch">
                        {displayedClients.map(client => (
                            <Grid item key={client.user_id} xs={12} sm={6} md={4} lg={3}>
                                <div onClick={() => handleRowClick(client.user_id)} style={{ height: '100%', display: 'flex', justifyContent: 'center' }}>
                                    <ClientCard {...client} />
                                </div>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* 🔁 התחתית לצורך observer */}
                <div ref={loaderRef} style={{ height: 100, margin: '20px auto' }}>
                    {loading && (
                        <Box display="flex" justifyContent="center" mt={4}>
                            <CircularProgress color="secondary" />
                        </Box>
                    )}
                </div>
                {/* אלמנט תחתון בשביל ה־observer */}
<div ref={loaderRef} style={{ height: '1px' }} />

            </Box>
        </ThemeProvider>
    );
}
