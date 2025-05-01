import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Modal,
    Avatar, Chip, IconButton, Menu, MenuItem, Tooltip, Dialog, DialogActions, DialogTitle, Button, FormControl, Select
} from '@mui/material';
import { serverRequests } from '../Api';
import FeaturedPlayListIcon from '@mui/icons-material/FeaturedPlayList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CloseIcon from "@mui/icons-material/Close";
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import AddRecommendationModal from '../components/AddRecommendationModal'
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export default function ClientRecommendations({ clientId }) {
    const [recommendations, setRecommendations] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedRecommendation, setSelectedRecommendation] = useState(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [openAddToPurchasesModal, setOpenAddToPurchasesModal] = useState(false);
    const [status, setStatus] = useState("Unpaid");
    const [addRecommendationModal, setAddRecommendationModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const url = `recommendations/${clientId}`;
        serverRequests('GET', url, null)
            .then(response => response.json())
            .then(data => {
                if (data?.recommendations) {
                    const sortedRecommendations = data.recommendations.sort((a, b) =>
                        new Date(b.created_at) - new Date(a.created_at)
                    );
                    setRecommendations(sortedRecommendations);
                }
            })
            .catch(error => console.error('Error fetching recommendations:', error));
    }, [clientId]);

    const handleCloseModal = () => {
        setAddRecommendationModal(false);
    };

    const handleMenuOpen = (event, recommendation) => {
        setAnchorEl(event.currentTarget);
        setSelectedRecommendation(recommendation);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleNavigate = (productId) => {
        navigate(`/admin-home/products/${productId}`);
    };

    const handleAddToPurchases = () => {
        setOpenAddToPurchasesModal(true);
        handleMenuClose();
    };

    const handleDeleteRecommendation = () => {
        setOpenDeleteModal(true);
        handleMenuClose();
    };

    const onSuccess = (message) => {
        toast.success(message);
    };

    const onError = (message) => {
        toast.error(message);
    };

    const confirmDeleteRecommendation = () => {
        if (selectedRecommendation) {
            serverRequests('DELETE', `recommendations/${selectedRecommendation.recommendation_id}`)
                .then(() => {
                    onSuccess("ההמלצה נמחקה בהצלחה")
                    setRecommendations(prev => prev.filter(p => p.recommendation_id !== selectedRecommendation.recommendation_id));
                    setOpenDeleteModal(false);
                })
                .catch(error => {
                    onError("יש בעיה במחיקת ההמלצה")
                    console.error('Error deleting recommendation:', error)
                }
                );
        }
    };

    const confirmAddToPurchases = async () => {
        if (!selectedRecommendation) return;

        try {
            await serverRequests('DELETE', `recommendations/${selectedRecommendation.recommendation_id}`);
            setRecommendations(prev => prev.filter(p => p.recommendation_id !== selectedRecommendation.recommendation_id));

            const body = {
                clientId,
                productId: selectedRecommendation.product_id,
                status,
            };

            const response = await serverRequests("POST", "purchases", body);
            const data = await response.json();

            if (data.success) {
                toast.success("הרכישה נוספה בהצלחה!");
                setOpenAddToPurchasesModal(false);
            } else {
                toast.error(data.message || "שגיאה בהוספת רכישה");
            }
        } catch (error) {
            console.error("Error adding purchase:", error);
            toast.error("שגיאה בהוספת רכישה");
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <ToastContainer position="top-center" reverseOrder={false} />
            <Tooltip title="הוסיפי המלצה" arrow>
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={() => setAddRecommendationModal(true)}
                    sx={{
                        top: '-3%',
                        right: '85%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#B68FFF',
                        color: '#fff',
                        '&:hover': { backgroundColor: '#A256E8' },
                        order: { xs: 1, sm: 0 },
                    }}
                >
                    <AddIcon />
                </Fab>
            </Tooltip>
            <Modal
                open={addRecommendationModal}
                onClose={handleCloseModal}
                aria-labelledby="add-recommendation-modal"
                aria-describedby="form-to-add-recommendation"
            >
                <AddRecommendationModal onClose={handleCloseModal} clientId={clientId} setRecommendations={setRecommendations} onSuccess={onSuccess} onError={onError} />
            </Modal>
            {recommendations.length === 0 ? (
                <Typography variant="h6" align="center" sx={{ padding: 2, color: 'gray' }}>
                    אין עדיין המלצות
                </Typography>
            ) : (
                <TableContainer component={Paper} sx={{ mt: 3 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>תמונה</TableCell>
                                <TableCell>שם המוצר</TableCell>
                                <TableCell>מחיר</TableCell>
                                <TableCell>תיאור</TableCell>
                                <TableCell>תאריך המלצה</TableCell>
                                <TableCell>פעולות</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recommendations.map((recommendation) => (
                                <TableRow key={recommendation.product_id} hover>
                                    <TableCell>
                                        <Avatar src={recommendation.image_path || '/default-product.jpg'} variant="square" />
                                    </TableCell>
                                    <TableCell>{recommendation.product_name}</TableCell>
                                    <TableCell>{recommendation.product_price} ₪</TableCell>
                                    <TableCell>
                                        {recommendation.product_description
                                            ? recommendation.product_description.length > 50
                                                ? `${recommendation.product_description.substring(0, 50)}...`
                                                : recommendation.product_description
                                            : "אין תיאור"}
                                    </TableCell>

                                    <TableCell>{new Date(recommendation.created_at).toLocaleDateString('he-IL')}</TableCell>
                                    <TableCell>
                                        <IconButton onClick={(event) => handleMenuOpen(event, recommendation)}>
                                            <MoreVertIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={() => handleNavigate(selectedRecommendation?.product_id)}>
                    <FeaturedPlayListIcon sx={{ mr: 1 }} />
                    מעבר לדף המוצר
                </MenuItem>
                <MenuItem onClick={handleAddToPurchases}>
                    <ShoppingCartIcon sx={{ mr: 1 }} />
                    רכישת המוצר
                </MenuItem>
                <MenuItem onClick={handleDeleteRecommendation} sx={{ color: 'red' }}>
                    <DeleteIcon sx={{ mr: 1 }} />
                    מחיקת המלצה
                </MenuItem>
            </Menu>
            <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
                <DialogTitle>האם אתה בטוח שברצונך למחוק את ההמלצה על {selectedRecommendation?.product_name}?</DialogTitle>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteModal(false)}>ביטול</Button>
                    <Button onClick={confirmDeleteRecommendation} color="error">
                        מחק
                    </Button>
                </DialogActions>
            </Dialog>
            <Modal open={openAddToPurchasesModal} onClose={() => setOpenAddToPurchasesModal(false)}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 350,
                        bgcolor: "background.paper",
                        boxShadow: 24,
                        p: 4,
                        borderRadius: 2,
                        position: "relative"
                    }}
                >
                    <IconButton
                        sx={{ position: "absolute", top: 6, left: 6 }}
                        onClick={() => setOpenAddToPurchasesModal(false)}
                    >
                        <CloseIcon />
                    </IconButton>
                    <Typography variant="h6">רכישת המוצר <b>"{selectedRecommendation?.product_name}"</b></Typography>
                    <Typography variant="body1">בחר סטטוס תשלום</Typography>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <MenuItem value="Paid">שולם</MenuItem>
                            <MenuItem value="Unpaid">לא שולם</MenuItem>
                        </Select>
                    </FormControl>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                        <Button
                            onClick={confirmAddToPurchases}
                            variant="contained"
                            fullWidth
                            sx={{
                                mt: 2,
                                backgroundColor: '#B68FFF',
                                color: '#fff',
                                '&:hover': {
                                    backgroundColor: '#A256E8',
                                }
                            }}
                        >
                            רכישה
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
}
