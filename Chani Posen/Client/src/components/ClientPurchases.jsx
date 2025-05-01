import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Modal,
    Avatar, Chip, IconButton, Menu, MenuItem, Tooltip, Dialog, DialogActions, DialogTitle, Button
} from '@mui/material';
import { serverRequests } from '../Api';
import FeaturedPlayListIcon from '@mui/icons-material/FeaturedPlayList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import { ToastContainer, toast } from 'react-toastify';
import EditClientPurchaseStatusModal from '../components/EditClientPurchaseStatusModal';
import AddPurchaseModal from '../components/AddPurchaseModal'
import { useNavigate } from 'react-router-dom';

export default function ClientPurchases({ clientId, userData }) {
    const [purchases, setPurchases] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [addPurchaseModal, setAddPurchaseModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const url = `purchases/client/${clientId}`;
        serverRequests('GET', url, null)
            .then(response => response.json())
            .then(data => {
                if (data?.purchases) {
                    const sortedPurchases = data.purchases.sort((a, b) =>
                        new Date(b.purchase_date) - new Date(a.purchase_date)
                    );
                    setPurchases(sortedPurchases);
                }
            })
            .catch(error => console.error('Error fetching purchases:', error));
    }, [clientId]);


    const handleCloseModal = () => {
        setAddPurchaseModal(false);
    };

    const handleNavigate = (productId) => {
        navigate(`/admin-home/products/${productId}`);
    };

    const handleMenuOpen = (event, product) => {
        setAnchorEl(event.currentTarget);
        setSelectedProduct(product);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleEditStatus = () => {
        setOpenEditModal(true);
        handleMenuClose();
    };

    const handleDeletePurchase = () => {
        setOpenDeleteModal(true);
        handleMenuClose();
    };

    const onSuccess = (message) => {
        toast.success(message);
    };

    const onError = (message) => {
        toast.error(message);
    };

    const confirmDeletePurchase = () => {
        if (selectedProduct) {
            serverRequests('DELETE', `purchases/${selectedProduct.purchase_id}`)
                .then(() => {
                    onSuccess("הרכישה נמחקה בהצלחה")
                    setPurchases(prev => prev.filter(p => p.purchase_id !== selectedProduct.purchase_id));
                    setOpenDeleteModal(false);
                })
                .catch(error => {
                    onError("יש בעיה במחיקת הרכישה")
                    console.error('Error deleting purchase:', error)
                }
                );
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <ToastContainer position="top-center" reverseOrder={false} />
            <Tooltip title="הוסיפי רכישה" arrow>
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={() => setAddPurchaseModal(true)}
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
                open={addPurchaseModal}
                onClose={handleCloseModal}
                aria-labelledby="add-purchase-modal"
                aria-describedby="form-to-add-purchase"
            >
                <AddPurchaseModal onClose={handleCloseModal} clientId={clientId} userData={userData} setPurchases={setPurchases} onSuccess={onSuccess} onError={onError} />
            </Modal>

            {purchases.length === 0 ? (
                <Typography variant="h6" align="center" sx={{ padding: 2, color: 'gray' }}>
                    אין עדיין רכישות
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
                                <TableCell>תאריך רכישה</TableCell>
                                <TableCell>סטטוס</TableCell>
                                <TableCell>פעולות</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {purchases.map((product) => (
                                <TableRow key={product.product_id} hover>
                                    <TableCell>
                                        <Avatar src={product.image_path || '/default-product.jpg'} variant="square" />
                                    </TableCell>
                                    <TableCell>{product.product_name}</TableCell>
                                    <TableCell>{product.product_price} ₪</TableCell>
                                    <TableCell>
                                        {product.product_description
                                            ? product.product_description.length > 50
                                                ? `${product.product_description.substring(0, 50)}...`
                                                : product.product_description
                                            : "אין תיאור"}
                                    </TableCell>

                                    <TableCell>{new Date(product.purchase_date).toLocaleDateString('he-IL')}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={product.status === 'Paid' ? 'שולם' : 'לא שולם'}
                                            color={product.status === 'Paid' ? 'success' : 'error'}
                                            variant="outlined"
                                            sx={{
                                                borderRadius: '16px',
                                                padding: '4px 10px',
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton onClick={(event) => handleMenuOpen(event, product)}>
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
                <MenuItem onClick={() => handleNavigate(selectedProduct?.product_id)}>
                    <FeaturedPlayListIcon sx={{ mr: 1 }} />
                    מעבר לדף המוצר
                </MenuItem>
                <MenuItem onClick={handleEditStatus}>
                    <EditIcon sx={{ mr: 1 }} />
                    עריכת סטטוס
                </MenuItem>
                <MenuItem onClick={handleDeletePurchase} sx={{ color: 'red' }}>
                    <DeleteIcon sx={{ mr: 1 }} />
                    מחיקת רכישה
                </MenuItem>
            </Menu>

            {openEditModal && selectedProduct && (
                <EditClientPurchaseStatusModal
                    open={openEditModal}
                    onClose={() => setOpenEditModal(false)}
                    purchase={selectedProduct}
                    purchases={purchases}
                    setPurchases={setPurchases}
                    onSuccess={onSuccess} 
                    onError={onError}
                />
            )}

            <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
                <DialogTitle>האם אתה בטוח שברצונך למחוק את הרכישה של {selectedProduct?.product_name}?</DialogTitle>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteModal(false)}>ביטול</Button>
                    <Button onClick={confirmDeletePurchase} color="error">
                        מחק
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
