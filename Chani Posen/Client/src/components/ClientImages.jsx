import React, { useEffect, useState, useRef } from 'react';
import { Box, Modal, Dialog, DialogTitle, DialogActions, Button, TextField, Chip, Grid, Card, CardMedia, CardContent, Typography, IconButton, Menu, MenuItem, Tooltip, Fab } from '@mui/material';
import { MoreVert, Edit, Delete, Add as AddIcon } from '@mui/icons-material';
import { serverRequests } from '../Api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ImageViewer from '../components/ImageViewer';
import AddImageModal from '../components/AddImageModal';
import EditImageModal from '../components/EditImageModal';
import { useOutletContext } from 'react-router-dom';


export default function ClientImages({  userData }) {
    const { clientId } = useOutletContext();
    const [images, setImages] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openImageViewer, setOpenImageViewer] = useState(false);
    const [addImageModal, setAddImageModal] = useState(false);
    const [editImageModal, setEditImageModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [filter, setFilter] = useState('all');

    const handleImageAdded = () => {
        setRefreshKey((prev) => prev + 1);
    };

    useEffect(() => {
        const url = `images/${clientId}`;
        serverRequests('GET', url, null)
            .then(response => response.json())
            .then(data => {
                if (data?.images) {
                    const sortedImages = data.images.sort((a, b) =>
                        new Date(b.uploaded_at) - new Date(a.uploaded_at)
                    );
                    setImages(sortedImages);
                }
            })
            .catch(error => console.error('Error fetching images:', error));
    }, [clientId, refreshKey]);

    const handleMenuClick = (event, image) => {
        setAnchorEl(event.currentTarget);
        setSelectedImage(image);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleEditImage = () => {
        handleMenuClose();
        setEditImageModal(true);
    };

    const handleDeleteImage = () => {
        handleMenuClose();
        setOpenDeleteDialog(true);
    };

    const handleCloseModal = () => {
        setAddImageModal(false);
        setEditImageModal(false);
    };

    const onSuccess = (message) => {
        toast.success(message);
    };

    const onError = (message) => {
        toast.error(message);
    };

    const confirmDeleteImage = () => {
        setOpenDeleteDialog(false);
        if (selectedImage) {
            serverRequests('DELETE', `images/${selectedImage.image_id}`)
                .then(() => {
                    onSuccess("התמונה נמחקה בהצלחה");
                    setImages(prev => prev.filter(p => p.image_id !== selectedImage.image_id));
                    setOpenDeleteDialog(false);
                })
                .catch(error => {
                    onError("יש בעיה במחיקת התמונה");
                    console.error('Error deleting image:', error);
                });
        }
    };

    const filteredImages = images.filter(image => {
        const matchesSearch = image.description.toLowerCase().includes(searchText.toLowerCase());
        if (filter === 'all') return matchesSearch;
        if (filter === 'mine') return matchesSearch && image.uploaded_by === userData.username;
        if (filter === 'others') return matchesSearch && image.uploaded_by !== userData.username;
        return true;
    });

    return (
        <Box sx={{ p: 3 }} dir="rtl">
            <ToastContainer position="top-center" reverseOrder={false} />
            <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={5} dir="rtl">
                <Tooltip title="הוסיפי תמונת טיפול" arrow>
                    <Fab
                        color="primary"
                        aria-label="add"
                        onClick={() => setAddImageModal(true)}
                        sx={{
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
                <TextField
                    placeholder="חפש לפי תיאור"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    variant="outlined"
                    sx={{
                        width: { xs: '80%', sm: '500px' },
                        transition: 'width 0.3s ease-in-out',
                    }}
                />
                <Chip label="הכל" onClick={() => setFilter('all')} sx={{ mx: 1, fontWeight: 'bold', cursor: 'pointer', backgroundColor: filter === 'all' ? 'gray' : 'transparent', color: filter === 'all' ? 'white' : 'gray', border: '1px solid gray', '&:hover': { backgroundColor: 'gray', color: 'white' } }} />
                <Chip label="הועלו על ידך" onClick={() => setFilter('mine')} sx={{ mx: 1, fontWeight: 'bold', cursor: 'pointer', backgroundColor: filter === 'mine' ? '#6FCF97' : 'transparent', color: filter === 'mine' ? 'white' : '#6FCF97', border: '1px solid #6FCF97', '&:hover': { backgroundColor: '#6FCF97', color: 'white' } }} />
                <Chip label="הועלו על ידי אחרים" onClick={() => setFilter('others')} sx={{ mx: 1, fontWeight: 'bold', cursor: 'pointer', backgroundColor: filter === 'others' ? '#B68FFF' : 'transparent', color: filter === 'others' ? 'white' : '#B68FFF', border: '1px solid #B68FFF', '&:hover': { backgroundColor: '#B68FFF', color: 'white' } }} />
            </Box>


            <Modal
                open={addImageModal}
                onClose={handleCloseModal}
                aria-labelledby="add-image-modal"
                aria-describedby="form-to-add-image"
            >
                <AddImageModal onClose={handleCloseModal} handleImageAdded={handleImageAdded} clientId={clientId} userId={userData.user_id} setImages={setImages} onSuccess={onSuccess} onError={onError} />
            </Modal>
            <Modal
                open={editImageModal}
                onClose={handleCloseModal}
                aria-labelledby="edit-image-modal"
                aria-describedby="form-to-edit-image"
            >
                <EditImageModal
                    onClose={handleCloseModal}
                    selectedImage={selectedImage}
                    clientId={clientId}
                    userId={userData.user_id}
                    setSelectedImage={setSelectedImage}
                    onSuccess={onSuccess}
                    onError={onError}
                />
            </Modal>

            {filteredImages.length === 0 ? (
                <Typography variant="h6" align="center" sx={{ padding: 2, color: 'gray' }}>
                    אין תמונות
                </Typography>
            ) : (
                <Grid container spacing={2} justifyContent="center">
                    {filteredImages.map((image) => (
                        <Grid item xs={12} sm={6} md={4} key={image.image_id}>
                            <Card
                                sx={{
                                    maxWidth: 400,
                                    mx: 'auto',
                                    borderRadius: 2,
                                    boxShadow: 2,
                                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                        boxShadow: 6,
                                    },
                                }}
                            >
                                <Box sx={{ position: 'relative' }}>
                                    <CardMedia
                                        key={Date.now()}
                                        component="img"
                                        image={image.image_path}
                                        alt="תמונה"
                                        sx={{
                                            width: '100%',
                                            height: 'auto',
                                            maxHeight: 250,
                                            objectFit: 'cover',
                                            borderTopLeftRadius: '8px',
                                            borderTopRightRadius: '8px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => {
                                            setSelectedImage(image);
                                            setOpenImageViewer(true);
                                        }}
                                    />
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            left: 8,
                                            right: 8,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Chip
                                            label={image.uploaded_by === userData.username ? 'הועלה על ידך' : `הועלה על ידי ${image.first_name} ${image.last_name}`}
                                            sx={{
                                                backgroundColor: image.uploaded_by === userData.username ? '#6FCF97' : '#B68FFF',
                                                color: 'white',
                                                fontWeight: 'bold',
                                            }}
                                        />
                                        <IconButton
                                            sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                                            onClick={(event) => handleMenuClick(event, image)}
                                        >
                                            <MoreVert />
                                        </IconButton>
                                    </Box>

                                </Box>
                                <CardContent sx={{ textAlign: 'left', backgroundColor: '#f5f5f5' }}>
                                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#333' }}>
                                        {image.description || 'ללא תיאור'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#666' }}>
                                        <strong>בתאריך:</strong> {new Date(image.uploaded_at).toLocaleDateString('he-IL')}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={handleEditImage}>
                    <Edit sx={{ marginRight: 1 }} /> עריכת פרטים
                </MenuItem>
                <MenuItem onClick={handleDeleteImage} sx={{ color: "red" }}>
                    <Delete sx={{ marginRight: 1 }} /> מחיקת תמונה
                </MenuItem>
            </Menu>

            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>האם אתה בטוח שברצונך למחוק את התמונה?</DialogTitle>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
                        ביטול
                    </Button>
                    <Button onClick={confirmDeleteImage} color="error">
                        מחק
                    </Button>
                </DialogActions>
            </Dialog>

            {openImageViewer && selectedImage && (
                <ImageViewer
                    image={selectedImage}
                    onClose={() => setOpenImageViewer(false)}
                />

            )}
        </Box>
    );
}
