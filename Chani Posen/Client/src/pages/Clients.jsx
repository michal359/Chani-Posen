import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverRequests } from '../Api';
import ClientCard from '../components/ClientCard';
import ClientTable from '../components/ClientTable';
import {
    Box, Button, Typography, Grid
} from "@mui/material";
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
    const [allClients, setAllClients] = useState([]);
    const [viewMode, setViewMode] = useState('table');
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [totalClients, setTotalClients] = useState(null);
    const clientsPerPage = 8;

    const navigate = useNavigate();
    const loaderRef = useRef(null);
    const isFirstLoadRef = useRef(true); // חדש

    const loadMoreClients = async () => {
        if (loading || !hasMore) return;
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

            const sorted = updatedClients.sort((a, b) =>
                a.first_name.localeCompare(b.first_name, 'he')
            );

            setAllClients(sorted);
            setClients(sorted);
            setTotalClients(data.totalClients || 0);

            const totalSoFar = sorted.length;
            const totalExpected = data.totalClients || 0;

            if (totalSoFar >= totalExpected || newClients.length < clientsPerPage) {
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
        if (isFirstLoadRef.current) {
            // איפוס מצב ברענון
            setPage(1);
            setClients([]);
            setAllClients([]);
            setHasMore(true);
            isFirstLoadRef.current = false;

            loadMoreClients();
        }
    }, []);

    useEffect(() => {
        if (!loaderRef.current) return;

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
    }, [hasMore, loading, loaderRef]);

    const handleRowClick = (clientId) => {
        navigate(`/admin-home/clients/${clientId}`);
    };

    if (clients.length === 0 && loading) {
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
    }

    return (
        <ThemeProvider theme={rtlTheme}>
            <Box padding={4} dir="rtl">
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

                {clients.length === 0 ? (
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
                                    <ClientCard {...client} />
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
                    {!hasMore && (
                        <Typography variant="body2" align="center" sx={{ mt: 2, color: 'gray' }}>
                            אין עוד לקוחות להצגה
                        </Typography>
                    )}
                </div>
            </Box>
        </ThemeProvider>
    );
}
