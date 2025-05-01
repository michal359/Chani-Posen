import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverRequests } from '../Api';
import { Box, TextField, Modal, Alert } from "@mui/material";
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import Tooltip from '@mui/material/Tooltip';
import AddProductModal from '../components/AddProductModal'
import { ToastContainer, toast } from 'react-toastify';
import '../css/loadingPoints.css';


export default function Products({ userData }) {
    const [allProducts, setAllProducts] = useState(null);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [addProductModal, setAddProductModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const url = 'products';
        serverRequests('GET', url, null)
            .then(response => {
                if (!response.ok) {
                    console.error('Failed to fetch products');
                    return;
                }
                return response.json();
            })
            .then(data => {
                if (data && data.products) {
                    const sortedProducts = data.products.sort((a, b) =>
                        a.product_name.localeCompare(b.product_name, 'he')
                    );
                    setAllProducts(sortedProducts);
                    setFilteredProducts(sortedProducts);
                }
            })
            .catch(error => {
                console.error('Error fetching products:', error);
            });
    }, []);

    const handleSearch = (term) => {
        setSearchTerm(term);
        filterProducts(term);
    };

    const filterProducts = (term) => {
        if (!allProducts.length) return;

        const lowercasedTerm = term.toLowerCase();
        const filtered = allProducts.filter(product =>
            product.product_name.toLowerCase().includes(lowercasedTerm)
        );

        setFilteredProducts(filtered);
    };

    const handleProductClick = (id) => {
        navigate(`/admin-home/products/${id}`);
    };

    const handleCloseModal = () => {
        setAddProductModal(false);
    };

    const onSuccess = (message) => {
        toast.success(message);  
    };

    const onError = (message) => {
        toast.error(message); 
    };

    const getImageWithCacheBust = (path) => `${path}?v=${new Date().getTime()}`;

    if (!allProducts)
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
        <div style={{ paddingTop: '20px', textAlign: 'center' }}>
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
                <ToastContainer position="top-center" reverseOrder={false} />
                <Tooltip title="הוסיפי מוצר" arrow>
                    <Fab
                        color="primary"
                        aria-label="add"
                        onClick={() => setAddProductModal(true)}
                        sx={{
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
                    label="חיפוש מוצר"
                    variant="outlined"
                    sx={{
                        width: { xs: '90%', sm: '500px' },
                        transition: 'width 0.3s ease-in-out',
                    }}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </Box>

            <Modal
                open={addProductModal}
                onClose={handleCloseModal}
                aria-labelledby="add-product-modal"
                aria-describedby="form-to-add-product"
            >
                <AddProductModal onClose={handleCloseModal} userId={userData.user_id} setAllProducts={setAllProducts} setFilteredProducts={setFilteredProducts} onSuccess={onSuccess} onError={onError} />
            </Modal>

            {filteredProducts.length === 0 && searchTerm && (
                <p style={{ textAlign: "center", fontSize: "18px", color: "#888" }}>
                    אין תוצאות התואמות לחיפוש שלך
                </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                {filteredProducts.map(product => (
                    <div
                        key={product.product_id}
                        onClick={() => handleProductClick(product.product_id)}
                        style={{
                            textAlign: 'center',
                            border: '1px solid #ddd',
                            padding: '10px',
                            borderRadius: '8px',
                            width: '200px',
                            cursor: 'pointer'
                        }}
                    >{console.log(product)}
                        <img
                            src={`${product.image_path}?v=${new Date().getTime()}`}
                            alt={product.product_name}
                            style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                        <h3 style={{ margin: '10px 0 5px' }}>{product.product_name}</h3>
                        <p style={{ fontWeight: 'bold', color: '#333' }}>{product.product_price} ₪</p>
                    </div>
                ))}
            </div>
        </div>


    );
}
