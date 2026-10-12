
import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Typography,
    TextField,
    List,
    ListItemButton,
    ListItemText,
    Avatar,
    CircularProgress,
    Alert
} from "@mui/material";

import { serverRequests } from "../Api";

export default function ProductSelector({
    selectedProduct,
    onSelect,
    title = "בחירת מוצר"
}) {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Load products once when the selector opens.
    useEffect(() => {
        let active = true;

        async function loadProducts() {
            try {
                const response = await serverRequests(
                    "GET",
                    "products",
                    null
                );

                if (!response?.ok) {
                    throw new Error(
                        "לא ניתן לטעון את המוצרים"
                    );
                }

                const data = await response.json();

                if (!data.success) {
                    throw new Error(
                        data.message ||
                        "שגיאה בטעינת המוצרים"
                    );
                }

                if (active) {
                    setProducts(data.products || []);
                }

            } catch (err) {
                console.error(
                    "Error loading products:",
                    err
                );

                if (active) {
                    setError(
                        "שגיאה בטעינת רשימת המוצרים"
                    );
                }

            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadProducts();

        return () => {
            active = false;
        };
    }, []);

    // Filter by name and sort by number of purchases.
    const filteredProducts = useMemo(() => {
        const search = searchTerm
            .trim()
            .toLocaleLowerCase();

        return products
            .filter((product) =>
                String(product.product_name || "")
                    .toLocaleLowerCase()
                    .includes(search)
            )
            .sort((a, b) => {
                const popularity =
                    Number(b.purchase_count || 0) -
                    Number(a.purchase_count || 0);

                if (popularity !== 0) {
                    return popularity;
                }

                return String(a.product_name)
                    .localeCompare(
                        String(b.product_name),
                        "he"
                    );
            });
    }, [products, searchTerm]);

    function handleSelect(product) {
        if (!onSelect) return;

        // Clicking the selected product again
        // does not change the selection.
        onSelect(product);
    }

    return (
        <Box dir="rtl" sx={{ width: "100%" }}>
            <Typography
                fontWeight="bold"
                sx={{ mb: 1 }}
            >
                {title}
            </Typography>

            <TextField
                fullWidth
                size="small"
                label="חיפוש מוצר"
                placeholder="הקלד שם מוצר..."
                value={searchTerm}
                onChange={(event) =>
                    setSearchTerm(event.target.value)
                }
                sx={{ mb: 1 }}
            />

            <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                    display: "block",
                    mb: 1
                }}
            >
                המוצרים הנרכשים ביותר מופיעים ראשונים
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <List
                sx={{
                    maxHeight: 220,
                    overflowY: "auto",
                    border: "1px solid #ddd",
                    borderRadius: 2,
                    p: 0.5
                }}
            >
                {loading ? (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            p: 3
                        }}
                    >
                        <CircularProgress size={24} />
                    </Box>
                ) : filteredProducts.length === 0 ? (
                    <Typography
                        align="center"
                        color="text.secondary"
                        sx={{ p: 3 }}
                    >
                        לא נמצאו מוצרים
                    </Typography>
                ) : (
                    filteredProducts.map((product) => {
                        const isSelected =
                            selectedProduct?.product_id ===
                            product.product_id;

                        const purchaseCount = Number(
                            product.purchase_count || 0
                        );

                        return (
                            <ListItemButton
                                key={product.product_id}
                                selected={isSelected}
                                onClick={() =>
                                    handleSelect(product)
                                }
                                sx={{
                                    borderRadius: 1,
                                    gap: 1.5,
                                    mb: 0.5,
                                    border: isSelected
                                        ? "1px solid #B68FFF"
                                        : "1px solid transparent",

                                    "&.Mui-selected": {
                                        bgcolor: "#F3E8FF"
                                    },

                                    "&.Mui-selected:hover": {
                                        bgcolor: "#E9D5FF"
                                    }
                                }}
                            >
                                <Avatar
                                    src={
                                        product.image_path ||
                                        undefined
                                    }
                                    variant="rounded"
                                    sx={{
                                        width: 44,
                                        height: 44
                                    }}
                                />

                                <ListItemText
                                    primary={
                                        product.product_name
                                    }
                                    secondary={
                                        `${Number(
                                            product.product_price
                                        ).toFixed(2)} ₪`
                                    }
                                    primaryTypographyProps={{
                                        fontWeight: isSelected
                                            ? "bold"
                                            : "normal"
                                    }}
                                />

                                <Box
                                    sx={{
                                        textAlign: "center",
                                        minWidth: 65,
                                        flexShrink: 0
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        fontWeight="bold"
                                        sx={{
                                            color: "#8B5BC7"
                                        }}
                                    >
                                        {purchaseCount}
                                    </Typography>

                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        רכישות
                                    </Typography>
                                </Box>
                            </ListItemButton>
                        );
                    })
                )}
            </List>

            {selectedProduct && (
                <Box
                    sx={{
                        mt: 2,
                        p: 1.5,
                        bgcolor: "#F3E8FF",
                        border: "1px solid #B68FFF",
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2
                    }}
                >
                    <Box>
                        <Typography
                            variant="body2"
                            fontWeight="bold"
                        >
                            מוצר נבחר:
                            {" "}
                            {selectedProduct.product_name}
                        </Typography>

                        <Typography
                            variant="caption"
                            color="text.secondary"
                        >
                            {Number(
                                selectedProduct.product_price
                            ).toFixed(2)} ₪
                        </Typography>
                    </Box>
                </Box>
            )}
        </Box>
    );
}
