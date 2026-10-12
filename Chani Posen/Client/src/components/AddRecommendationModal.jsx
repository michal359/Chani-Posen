
import React, { useState } from "react";

import {
    Box,
    Button,
    Typography,
    IconButton,
    Alert,
    CircularProgress
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";

import { serverRequests } from "../Api";
import ProductSelector from "./ProductSelector";

export default function AddRecommendationModal({
    onClose,
    clientId,
    setRecommendations,
    onSuccess,
    onError
}) {
    const [selectedProduct, setSelectedProduct] =
        useState(null);

    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    // Select a product from the shared selector
    function handleProductSelect(product) {
        setSelectedProduct(product);
        setError("");
    }

    // Add recommendation
    async function handleAddRecommendation() {
        if (!selectedProduct) {
            setError("אנא בחר מוצר");
            return;
        }

        if (saving) return;

        setSaving(true);
        setError("");

        try {
            const body = {
                productId: selectedProduct.product_id,
                clientId: clientId
            };

            const response = await serverRequests(
                "POST",
                "recommendations",
                body
            );

            if (
                !response ||
                typeof response.json !== "function"
            ) {
                throw new Error(
                    "לא ניתן להתחבר לשרת"
                );
            }

            const data = await response.json();

            // Recommendation already exists
            if (data.alreadyExists) {
                const message =
                    "המלצה על המוצר הזה כבר קיימת";

                setError(message);
                onError?.(message);
                return;
            }

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "הוספת ההמלצה נכשלה"
                );
            }

            // Update recommendation list
            if (typeof setRecommendations === "function") {
                setRecommendations((previous) => [
                    {
                        recommendation_id:
                            data.recommendationId,

                        created_at:
                            data.createdAt,

                        client_id: clientId,

                        product_id:
                            selectedProduct.product_id,

                        product_name:
                            selectedProduct.product_name,

                        product_price:
                            selectedProduct.product_price,

                        product_description:
                            selectedProduct.product_description ||
                            "אין תיאור",

                        image_path:
                            selectedProduct.image_path ||
                            "/default-product.jpg"
                    },
                    ...previous
                ]);
            }

            onSuccess?.("ההמלצה נוספה בהצלחה!");
            onClose();

        } catch (err) {
            console.error(
                "Error adding recommendation:",
                err
            );

            const message =
                err.message || "שגיאה בהוספת המלצה";

            setError(message);
            onError?.(message);

        } finally {
            setSaving(false);
        }
    }

    return (
        <Box
            dir="rtl"
            sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",

                width: {
                    xs: "94%",
                    sm: 480
                },

                maxHeight: "90vh",
                overflowY: "auto",

                bgcolor: "background.paper",
                boxShadow: 24,
                p: 3,
                borderRadius: 2,
                boxSizing: "border-box"
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3
                }}
            >
                <Typography variant="h6">
                    הוספת המלצה חדשה
                </Typography>

                <IconButton
                    onClick={onClose}
                    disabled={saving}
                >
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Error message */}
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                >
                    {error}
                </Alert>
            )}

            {/* Shared product selection component */}
            <ProductSelector
                selectedProduct={selectedProduct}
                onSelect={handleProductSelect}
                title="בחירת מוצר להמלצה"
            />

            {/* Save button */}
            <Button
                variant="contained"
                fullWidth
                disabled={!selectedProduct || saving}
                onClick={handleAddRecommendation}
                sx={{
                    mt: 3,
                    bgcolor: "#B68FFF",

                    "&:hover": {
                        bgcolor: "#A256E8"
                    }
                }}
            >
                {saving ? (
                    <CircularProgress
                        size={22}
                        color="inherit"
                    />
                ) : (
                    "הוסף המלצה"
                )}
            </Button>
        </Box>
    );
}
