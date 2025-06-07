import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverRequests } from '../Api';
import ClientCard from '../components/ClientCard';
import ClientTable from '../components/ClientTable';
import AddNewClient from '../components/AddNewClient';
import {
    Box, Button, Typography, Grid
} from "@mui/material";
import TextField from "@mui/material/TextField";
import { ViewList, GridView } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import debounce from 'lodash.debounce';
import '../css/loadingPoints.css';

const rtlTheme = createTheme({
    direction: 'rtl',
    typography: {
        fontFamily: 'Arial, sans-serif',
    },
});

export default function Clients({ userData }) {
    const [viewMode, setViewMode] = useState('table');
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [totalClients, setTotalClients] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const clientsPerPage = 8;
    const [showScrollButton, setShowScrollButton] = useState(false);

    const navigate = useNavigate();
    const loaderRef = useRef(null);
    const isFirstLoadRef = useRef(true);

    const loadMoreClients = async () => {
        if (loading || !hasMore || searchTerm) return;
        setLoading(true);

        try {
            const url = `clients?page=${page}&limit=${clientsPerPage}`;
            const response = await serverRequests('GET', url, null);

            if (!response.ok) {
                console.error('Failed to fetch clients');
                return;
            }

            const data = await response.json();
            const newClients = data.clients || [];
            const updatedClients = [...clients, ...newClients];

            setClients(updatedClients);
            setTotalClients(data.totalClients || 0);

            if (updatedClients.length >= data.totalClients || newClients.length < clientsPerPage) {
                setHasMore(false);
            } else {
                setPage(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchSearchResults = async () => {
            setLoading(true);
            try {
                const url = searchTerm
                    ? `clients?search=${encodeURIComponent(searchTerm)}`
                    : `clients?page=1&limit=${clientsPerPage}`;

                const response = await serverRequests('GET', url, null);
                if (!response.ok) {
                    console.error('Failed to fetch clients');
                    return;
                }

                const data = await response.json();
                setClients(data.clients || []);
                setHasMore(!searchTerm);
                setTotalClients(data.totalClients || 0);
                if (!searchTerm) setPage(2);
            } catch (error) {
                console.error('Error during search:', error);
            } finally {
                setLoading(false);
            }
        };

        const debouncedSearch = debounce(fetchSearchResults, 300);
        debouncedSearch();

        return () => {
            debouncedSearch.cancel();
        };
    }, [searchTerm]);

    // טעינה ראשונית
    useEffect(() => {
        if (isFirstLoadRef.current && !searchTerm) {
            isFirstLoadRef.current = false;
            loadMoreClients();
        }
    }, [searchTerm]);

    // גלילה אינסופית
    useEffect(() => {
        if (!loaderRef.current || searchTerm) return;

        const observer = new IntersectionObserver(
            entries => {
                const entry = entries[0];
                if (entry.isIntersecting && hasMore && !loading) {
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
    }, [hasMore, loading, loaderRef, searchTerm]);

    const handleRowClick = (clientId) => {
        navigate(`/admin-home/clients/${clientId}`);
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollButton(true);
            } else {
                setShowScrollButton(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <ThemeProvider theme={rtlTheme}>
            <Box padding={4} dir="rtl">
                <Box display="flex" alignItems="center" justifyContent="center" gap={2} sx={{ flexDirection: { xs: 'column', sm: 'row' }, marginBottom: '20px' }}>
                    <AddNewClient userData={userData} />
                    <TextField
                        label="חיפוש לפי שם"
                        variant="outlined"
                        sx={{ width: { xs: '90%', sm: '500px' }, transition: 'width 0.3s ease-in-out' }}
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </Box>

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
                            '&:hover': { backgroundColor: '#A256E8' },
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
                            '&:hover': { backgroundColor: '#A256E8' },
                            boxShadow: viewMode === 'cards' ? '0px 0px 10px #9370DB' : 'none'
                        }}
                    >
                        <GridView />
                    </Button>
                </div>

                {clients.length === 0 && !loading ? (
                    <Typography variant="h6" align="center" sx={{ mt: 4, color: 'gray' }}>
                        אין תוצאות התואמות לחיפוש שלך
                    </Typography>
                ) : viewMode === 'table' ? (
                    <ClientTable clients={clients} onRowClick={handleRowClick} />
                ) : (
                    <Grid container spacing={3} justifyContent="center" alignItems="stretch">
                        {clients.map(client => (
                            <Grid item key={client.user_id} xs={12} sm={6} md={4} lg={3}>
                                <div onClick={() => handleRowClick(client.user_id)} style={{ height: '100%', display: 'flex', justifyContent: 'center' }}>
                                    <ClientCard
                                        firstName={client.first_name}
                                        lastName={client.last_name}
                                        email={client.email}
                                        phone={client.phone}
                                        birthday={client.birth_date}
                                        status={client.treatment_status}
                                        skinType={client.skin_type}
                                        profileImage={client.profile_image}
                                        onClick={() => handleRowClick(client.user_id)}
                                    />
                                </div>
                            </Grid>
                        ))}
                    </Grid>
                )}

                <div ref={loaderRef} style={{ height: 100, margin: '20px auto' }}>
                    {loading && (
                        <Box display="flex" justifyContent="center" mt={4}>
                            <CircularProgress color="secondary" />
                        </Box>
                    )}
                    {!hasMore && !searchTerm && (
                        <Typography variant="body2" align="center" sx={{ mt: 2, color: 'gray' }}>
                            אין עוד לקוחות להצגה
                        </Typography>
                    )}
                </div>
            </Box>
            {showScrollButton && (
                <Tooltip title="חזרה לראש הדף" arrow>
                    <Fab
                        color="secondary"
                        aria-label="scroll-to-top"
                        sx={{
                            position: 'fixed',
                            bottom: 20,
                            right: 20,
                            backgroundColor: '#B68FFF',
                            '&:hover': {
                                backgroundColor: '#A256E8',
                            },
                        }}
                        onClick={scrollToTop}
                    >
                        <KeyboardArrowUpIcon />
                    </Fab>
                </Tooltip>
            )}

        </ThemeProvider>
    );
}
