import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Typography,
    IconButton,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Alert,
    Card,
    CardContent,
} from "@mui/material";
import { serverRequests } from "../Api";
import CloseIcon from "@mui/icons-material/Close";

export default function AddRecommendationModal({ onClose, clientId, setRecommendations, onSuccess, onError }) {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        serverRequests("GET", "products", null)
            .then(response => response.json())
            .then(data => {
                if (data && data.products) {
                    const sortedProducts = data.products.sort((a, b) =>
                        a.product_name.localeCompare(b.product_name, "he")
                    );
                    setProducts(sortedProducts);
                    setFilteredProducts(sortedProducts);
                }
            })
            .catch(error => {
                console.error("Error fetching products:", error);
                setError("שגיאה בטעינת רשימת המוצרים");
            });
    }, []);

    const handleSearch = (event) => {
        const value = event.target.value.toLowerCase();
        setSearchTerm(value);
        setFilteredProducts(
            products.filter((product) =>
                product.product_name.toLowerCase().includes(value)
            )
        );
    };

    const handleProductSelect = (product) => {
        setSelectedProduct(product);
    };

    const handleAddRecommendation = () => {
        if (!selectedProduct) {
            setError("אנא בחר מוצר");
            return;
        }

        const body = {
            productId: selectedProduct.product_id,
            clientId: clientId,
        };

        serverRequests("POST", "recommendations", body)
            .then(response => {
                return response.json();  
            })
            .then(data => {
                if (data.success) {
                    if (data.alreadyExists) {
                        onError("המלצה על המוצר הזה כבר קיימת");
                        return;
                    }
                    setRecommendations(prev => [
                        {
                            recommendation_id: data.recommendationId,
                            created_at: data.createdAt,
                            client_id: clientId,
                            product_id: selectedProduct.product_id,
                            product_name: selectedProduct.product_name,
                            product_price: selectedProduct.product_price,
                            product_description: selectedProduct.product_description || "אין תיאור",
                            image_path: selectedProduct.image_path || "/default-product.jpg",
                        },
                        ...prev
                    ]);
                    onSuccess("ההמלצה נוספה בהצלחה!");
                    onClose();
                } else {
                    console.error("Error received from server:", data.error);
                    onError(`שגיאה: ${data.error || "הוספת ההמלצה נכשלה, נסי שוב"}`);
                }
            })
            .catch(error => {
                console.error("שגיאה בלתי צפויה בשליחת המלצה:", error);
                onError("שגיאה בלתי צפויה");
            });

    };

    return (
        <Box
            sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 400,
                maxHeight: "80vh",
                bgcolor: "background.paper",
                boxShadow: 24,
                p: 4,
                borderRadius: "8px",
                overflow: "auto",
            }}
        >
            <IconButton
                onClick={onClose}
                sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    color: "text.primary",
                }}
            >
                <CloseIcon />
            </IconButton>
            <Typography variant="h6" mb={2}>הוספת המלצה</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
                fullWidth
                label="חפש מוצר..."
                variant="outlined"
                value={searchTerm}
                onChange={handleSearch}
                sx={{ mb: 2 }}
            />

            <List sx={{ maxHeight: 200, overflow: "auto", border: "1px solid #ddd", borderRadius: "4px", p: 1 }}>
                {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                        <ListItem
                            key={product.product_id}
                            button
                            selected={selectedProduct?.product_id === product.product_id}
                            onClick={() => handleProductSelect(product)}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                "&.Mui-selected": {
                                    backgroundColor: "#1976d2",
                                    color: "white",
                                },
                            }}
                        >
                            <ListItemAvatar>
                                <Avatar src={product.image_path || "/default-product.jpg"} />
                            </ListItemAvatar>
                            <ListItemText primary={product.product_name} />
                        </ListItem>
                    ))
                ) : (
                    <Alert severity="info" sx={{ width: "100%", textAlign: "center", p: 2 }}>
                        אין מוצרים התואמים לחיפוש
                    </Alert>
                )}
            </List>

            {/* מציג את המוצר שנבחר */}
            {selectedProduct && (
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
                        onClick={() => setSelectedProduct(null)}
                        sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            color: "#B68FFF",
                        }}
                    >
                        <CloseIcon />
                    </IconButton>

                    <Avatar
                        src={selectedProduct.image_path || "/default-product.jpg"}
                        sx={{ width: 80, height: 80, mr: 2, border: "2px solid #B68FFF" }}
                    />
                    <CardContent sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#B68FFF" }}>
                            {selectedProduct.product_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            ₪{selectedProduct.product_price}
                        </Typography>
                    </CardContent>
                </Card>
            )}

            <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleAddRecommendation}
                sx={{
                    mt: 2,
                    backgroundColor: '#B68FFF',
                    color: '#fff',
                    '&:hover': { backgroundColor: '#A256E8' },
                }}
                disabled={!selectedProduct}
            >
                הוסף המלצה
            </Button>
        </Box>
    );
}
