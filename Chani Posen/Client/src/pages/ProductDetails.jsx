import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serverRequests } from '../Api';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import EditProductModal from '../components/EditProductModal';
import RecommendProductModal from '../components/RecommendProductModal';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ToastContainer, toast } from 'react-toastify';

export default function ProductDetails({ userData }) {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [openEdit, setOpenEdit] = useState(false);
    const [openRecommend, setOpenRecommend] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [clients, setClients] = useState([]);
    const [showClients, setShowClients] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const url = `products/${id}`;
        serverRequests('GET', url, null)
            .then(response => response.json())
            .then(data => {
                if (data && data.product && Array.isArray(data.product) && data.product.length > 0) {
                    setProduct(data.product[0]); 
                } else {
                    console.warn("המוצר לא נמצא או שהמבנה שגוי:", data);
                }
            })
            .catch(error => {
                console.error('Error fetching product details:', error);
            });
    }, [id]);

    useEffect(() => {
        serverRequests('GET', `clients/anyId?productId=${id}`)
            .then(response => response.json())
            .then(data => {
                console.log("Clients response:", data);
                if (data && data.success && Array.isArray(data.clients)) {
                    setClients(data.clients);
                } else {
                    setClients([]); 
                }
            })
            .catch(error => {
                console.error('Error fetching clients:', error);
                setClients([]); 
            });
    }, [id]);    

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollButton(true);
            } else {
                setShowScrollButton(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleGoBackToProductsClick = () => {
        navigate(`/admin-home/products`);
    };

    const handleDeleteProduct = () => {
        serverRequests('DELETE', `products/${id}`)
            .then(response => {
                if (response.ok) {
                    toast.success('המוצר נמחק בהצלחה')
                    setOpenDeleteDialog(false);
                    setTimeout(() => {
                        navigate('/admin-home/products');
                    }, 2000);
                } else {
                    toast.error('מחיקת המוצר נכשלה, נסי שוב')
                    console.error('מחיקת מוצר נכשלה');
                }
            })
            .catch(error => {
                console.error('שגיאה במחיקת מוצר:', error);
            });

    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleShowClients = () => setShowClients(true);
    const handleCloseClients = () => setShowClients(false);
    const handleClientClick = (clientId) => navigate(`/admin-home/clients/${clientId}`);

    const formatDescription = (description) => {
        return description.split('\n').map((item, index) => (
            <React.Fragment key={index}>
                {item}
                <br />
            </React.Fragment>
        ));
    };

    if (!product) return <p style={{ textAlign: 'center' }}>טוען נתוני מוצר...</p>;

    const onSuccess = (message) => {
        toast.success(message);
    };

    const onError = (message) => {
        toast.error(message);
    };

    return (
        <div>
            <ToastContainer position="top-center" reverseOrder={false} />
            <Tooltip title="חזרה לכל המוצרים" arrow>
                <Fab
                    color="primary"
                    aria-label="back"
                    sx={{
                        position: 'fixed',
                        right: 'auto',
                        left: 25,
                        top: 120,
                        backgroundColor: '#B68FFF',
                        '&:hover': {
                            backgroundColor: '#A256E8',
                        },
                    }}
                    onClick={handleGoBackToProductsClick}
                >
                    <ArrowBackIcon />
                </Fab>
            </Tooltip>
            <div style={{
                display: 'flex',
                flexDirection: 'row-reverse',
                gap: '20px',
                padding: '10px',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
            }}>
                <img
                    src={product.image_path}
                    alt={product.product_name}
                    style={{
                        width: '100%',
                        maxWidth: '500px',
                        height: 'auto',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        marginBottom: '10px',

                    }}
                />

                <div style={{
                    textAlign: 'right',
                    maxWidth: 'calc(100% - 520px)',
                    marginLeft: '0',
                    flex: 1,
                    minWidth: '300px',
                }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {product.product_name}
                    </h2>
                    <p style={{ fontSize: '20px', marginBottom: '5px' }}>מחיר: {product.product_price} ₪</p>
                    <p style={{ fontSize: '18px', marginBottom: '5px' }}>יש {product.purchase_count} רכישות ממוצר זה</p>
                    <p style={{ fontSize: '18px', marginBottom: '10px' }}>המלצת על המוצר ל-{clients.length} לקוחות</p>

                    <Button
                        variant="contained"
                        onClick={handleShowClients}
                        disabled={clients.length === 0}
                        sx={{
                            backgroundColor: '#B68FFF',
                            fontSize: '18px',
                            padding: '8px 16px',
                            '&:hover': { backgroundColor: '#A256E8' }
                        }}
                    >
                        הצג לקוחות
                    </Button>

                    <p style={{ fontSize: '16px', marginTop: '10px', lineHeight: '1.4' }}>
                        {formatDescription(product.product_description) || "אין תיאור זמין"}
                    </p>
                </div>
            </div>


            <Dialog open={showClients} onClose={handleCloseClients}>
                <DialogTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '60px' }}>
                    לקוחות שהמלצת להן על: "{product.product_name}"
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={handleCloseClients}
                        aria-label="close"
                        style={{ position: 'absolute', right: 25 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {clients.map(client => (
                            <div
                                key={client.user_id}
                                style={{
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'transform 0.3s ease, opacity 0.3s ease',
                                    position: 'relative'
                                }}
                                onClick={() => handleClientClick(client.user_id)}
                            >
                                <img
                                    src={client.profile_image}
                                    alt={`${client.first_name} ${client.last_name}`}
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        transition: 'transform 0.3s ease'
                                    }}
                                />
                                <p>{client.first_name} {client.last_name}</p>
                                <p style={{ fontSize: '12px', color: 'gray' }}>מעבר לדף לקוחה</p>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>



            <SpeedDial
                ariaLabel="פעולות מוצר"
                sx={{
                    position: 'fixed',
                    left: 25,
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
                    tooltipTitle="עריכת מוצר"
                    onClick={() => setOpenEdit(true)}
                />
                <SpeedDialAction
                    icon={<ThumbUpIcon />}
                    tooltipTitle="המלצה ללקוחה"
                    onClick={() => setOpenRecommend(true)}
                />
                <SpeedDialAction
                    icon={<DeleteIcon />}
                    tooltipTitle="מחיקת מוצר"
                    onClick={() => setOpenDeleteDialog(true)}
                />
            </SpeedDial>

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

            {openEdit && <EditProductModal product={product} setProduct={setProduct} onClose={() => setOpenEdit(false)} userId={userData.user_id} onSuccess={onSuccess} onError={onError}/>}
            {openRecommend && <RecommendProductModal product={product} onClose={() => setOpenRecommend(false)} setClients={setClients} onSuccess={onSuccess} onError={onError}/>}

            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogContent>
                    <p>האם אתה בטוח שברצונך למחוק את המוצר <b>"{product.product_name}"</b>?</p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
                        ביטול
                    </Button>
                    <Button onClick={handleDeleteProduct} color="error">
                        מחיקה
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
