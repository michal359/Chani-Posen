import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Typography,
    IconButton,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
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

export default function AddPurchaseModal({ onClose, clientId, userData, setPurchases, onSuccess, onError }) {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [status, setStatus] = useState("Unpaid");
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

    const handleAddPurchase = () => {
        if (!selectedProduct) {
            setError("אנא בחר מוצר");
            return;
        }

        const body = {
            clientId,
            productId: selectedProduct.product_id,
            status,
        };

        serverRequests("POST", "purchases", body)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const newPurchase = {
                    purchase_id: data.purchaseId,
                    client_id: clientId,
                    product_id: selectedProduct.product_id,
                    purchase_date: new Date().toISOString(),
                    status,
                    product_name: selectedProduct.product_name,
                    product_price: selectedProduct.product_price,
                    product_description: selectedProduct.product_description || "אין תיאור",
                    image_path: selectedProduct.image_path || "/default-product.jpg",
                };

                setPurchases(prev => [newPurchase, ...prev]);

                if (status === "Unpaid") {
                    const notificationBody = {
                        user_id: userData.user_id,
                        notification_text: `רכישת "${selectedProduct.product_name}" עבור לקוחה מספר ${clientId} סומנה כלא שולם.`,
                        notification_type: 'PRODUCT',
                        entity_type: 'PURCHASE',
                        entity_id: data.purchaseId,
                        link: `/clients/${clientId}/products`,
                    };

                    serverRequests("POST", "notifications", notificationBody)
                        .then(res => res.json())
                        .then(nData => {
                            if (!nData.success) {
                                console.warn("התראה לא נוספה:", nData.message);
                            }
                        })
                        .catch(err => {
                            console.error("שגיאה בשליחת התראה:", err);
                        });
                }

                onSuccess("הרכישה נוספה בהצלחה!");
                onClose();
            } else {
                setError(data.message || "שגיאה בהוספת רכישה");
            }
        })
        .catch(error => {
            console.error("Error adding purchase:", error);
            setError("שגיאה בהוספת רכישה");
            onError("שגיאה בהוספת רכישה");
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
            <Typography variant="h6" mb={2}>הוספת רכישה</Typography>

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



            <FormControl fullWidth sx={{ mt: 2 }}>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <MenuItem value="Paid">שולם</MenuItem>
                    <MenuItem value="Unpaid">לא שולם</MenuItem>
                </Select>
            </FormControl>

            <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleAddPurchase}
                sx={{
                    mt: 2,
                    backgroundColor: '#B68FFF',
                    color: '#fff',
                    '&:hover': { backgroundColor: '#A256E8' },
                }}
                disabled={!selectedProduct} 
            >
                הוסף רכישה
            </Button>
        </Box>
    );
}
