import React, { useState, useEffect } from 'react';
import { serverRequests } from '../Api';
import { Box, Button, TextField, Typography, Avatar, Card, CardContent, IconButton, List, ListItem, ListItemAvatar, ListItemText, Alert, Backdrop, Modal } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function RecommendProductModal({ product, onClose, setClients, onSuccess, onError }) {
    const [allClients, setAllClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        serverRequests('GET', 'clients', null)
            .then(response => response.json())
            .then(data => {
                if (data && data.clients) {
                    const clientsWithNames = data.clients.map(client => ({
                        ...client,
                        client_name: `${client.first_name} ${client.last_name}`
                    }));

                    const sortedClients = clientsWithNames.sort((a, b) => a.client_name.localeCompare(b.client_name));
                    setAllClients(sortedClients);
                    setFilteredClients(sortedClients);
                }
            })
            .catch(error => {
                console.error('Error fetching clients:', error);
            });
    }, []);


    const handleSearch = (event) => {
        const value = event.target.value;
        setSearchTerm(value);
        setFilteredClients(
            allClients.filter(client => client.client_name.includes(value))
        );
    };

    const handleSelectClient = (client) => {
        setSelectedClient(client);
    };

    const handleRecommend = () => {

        if (!selectedClient || !selectedClient.user_id) {
            onError("נא לבחור לקוחה להמלצה");
            return;
        }

        const requestBody = {
            productId: product.product_id,
            clientId: selectedClient.user_id
        };

        serverRequests('POST', 'recommendations', requestBody)
            .then(response => {
                return response.json();
            })
            .then(response => {
                if (response.success) {
                    if (response.alreadyExists) {
                        onError('המלצה על המוצר הזה כבר קיימת ללקוחה זו');
                        return;
                    }
                    setClients(prevClients => [...prevClients, selectedClient]);
                    onSuccess(`המלצתך על "${product.product_name}" ללקוחה "${selectedClient.client_name}" נשמרה`);
                    setTimeout(() => {
                        onClose();
                    }, 2000);
                } else {
                    onError("המלצה נכשלה, נסי שוב");
                }
            })
            .catch(error => {
                console.error("שגיאה בשליחת המלצה:", error);
                onError("שגיאה בלתי צפויה");
            });
    };


    return (
        <Modal
            open={open}
            onClose={onClose}
            closeAfterTransition
            BackdropComponent={Backdrop}
            BackdropProps={{
                timeout: 500,
                sx: { backgroundColor: "rgba(0, 0, 0, 0.7)" }
            }}
        >
            <Box
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 500,
                    maxHeight: "80vh",
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "8px",
                    overflow: "auto",
                    direction: "rtl"
                }}
            >
                <IconButton
                    onClick={onClose}
                    sx={{ position: "absolute", top: 10, left: 10, color: "text.primary" }}
                >
                    <CloseIcon />
                </IconButton>
                <Typography variant="h6" mb={2}>המלצת מוצר ללקוחה</Typography>

                <TextField
                    fullWidth
                    label="חפש לקוחה..."
                    variant="outlined"
                    value={searchTerm}
                    onChange={handleSearch}
                    sx={{ mb: 2, direction: "rtl", textAlign: "right" }}
                />

                <List sx={{ maxHeight: 200, overflow: "auto", border: "1px solid #ddd", borderRadius: "4px", p: 1 }}>
                    {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                            <ListItem
                                key={client.client_id}
                                button
                                selected={selectedClient?.client_id === client.client_id}
                                onClick={() => handleSelectClient(client)}
                                sx={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    alignItems: "center",
                                    '&.Mui-selected': {
                                        backgroundColor: "#1976d2",
                                        color: "white",
                                    },
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar src={client.profile_image || "/default-client.jpg"} />
                                </ListItemAvatar>
                                <ListItemText primary={client.client_name} sx={{ textAlign: "right" }} />
                            </ListItem>
                        ))
                    ) : (
                        <Alert severity="info" sx={{ width: "100%", textAlign: "center", p: 2 }}>
                            אין לקוחות התואמים לחיפוש
                        </Alert>
                    )}
                </List>

                {selectedClient && (
                    <Card
                        sx={{
                            mt: 2,
                            p: 2,
                            display: "flex",
                            alignItems: "center",
                            border: "3px solid #B68FFF",
                            backgroundColor: "#F3E8FF",
                            borderRadius: "8px",
                            boxShadow: "0px 4px 10px rgba(162, 86, 232, 0.3)",
                            position: "relative",
                        }}
                    >
                        <IconButton
                            onClick={() => setSelectedClient(null)}
                            sx={{ position: "absolute", top: 4, right: 4, color: "#B68FFF" }}
                        >
                            <CloseIcon />
                        </IconButton>

                        <Avatar
                            src={selectedClient.profile_image || "/default-client.jpg"}
                            sx={{ width: 80, height: 80, mr: 2, border: "2px solid #B68FFF" }}
                        />
                        <CardContent sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#B68FFF" }}>
                                {selectedClient.client_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {selectedClient.email}
                            </Typography>
                        </CardContent>
                    </Card>
                )}

                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleRecommend}
                    sx={{ mt: 2, backgroundColor: '#B68FFF', color: '#fff', '&:hover': { backgroundColor: '#A256E8' } }}
                    disabled={!selectedClient}
                >
                    שלח המלצה
                </Button>
            </Box>
        </Modal>
    );
}
