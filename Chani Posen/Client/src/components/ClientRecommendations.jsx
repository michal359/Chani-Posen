
import React, { useState, useEffect, useCallback } from "react";

import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Modal,
    Avatar,
    IconButton,
    Menu,
    MenuItem,
    Tooltip,
    Dialog,
    DialogActions,
    DialogTitle,
    Button,
    CircularProgress
} from "@mui/material";

import { serverRequests } from "../Api";

import FeaturedPlayListIcon from "@mui/icons-material/FeaturedPlayList";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";

import AddRecommendationModal from "./AddRecommendationModal";
import AddPurchaseModal from "./AddPurchaseModal";

import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function ClientRecommendations({
    clientId,
    userData
}) {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [anchorEl, setAnchorEl] = useState(null);

    const [selectedRecommendation, setSelectedRecommendation] =
        useState(null);

    const [openDeleteModal, setOpenDeleteModal] =
        useState(false);

    const [openAddToPurchasesModal, setOpenAddToPurchasesModal] =
        useState(false);

    const [addRecommendationModal, setAddRecommendationModal] =
        useState(false);

    const [deleting, setDeleting] = useState(false);

    const navigate = useNavigate();

    // -----------------------------------------
    // Load client recommendations
    // -----------------------------------------
    const loadRecommendations = useCallback(async () => {
        try {
            const response = await serverRequests(
                "GET",
                `recommendations/${clientId}`
            );

            if (
                !response ||
                typeof response.json !== "function"
            ) {
                throw new Error("לא ניתן להתחבר לשרת");
            }

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "שגיאה בטעינת ההמלצות"
                );
            }

            const sorted = [...(data.recommendations || [])]
                .sort(
                    (a, b) =>
                        new Date(b.created_at) -
                        new Date(a.created_at)
                );

            setRecommendations(sorted);

        } catch (error) {
            console.error(
                "Error fetching recommendations:",
                error
            );

            toast.error("שגיאה בטעינת ההמלצות");

        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        setLoading(true);
        loadRecommendations();
    }, [loadRecommendations]);

    // -----------------------------------------
    // Messages
    // -----------------------------------------
    const onSuccess = (message) => {
        toast.success(message);
    };

    const onError = (message) => {
        toast.error(message);
    };

    // -----------------------------------------
    // Menu
    // -----------------------------------------
    const handleMenuOpen = (event, recommendation) => {
        setAnchorEl(event.currentTarget);
        setSelectedRecommendation(recommendation);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleNavigate = (productId) => {
        handleMenuClose();

        navigate(`/admin-home/products/${productId}`);
    };

    // -----------------------------------------
    // Open purchase modal with selected product
    // -----------------------------------------
    const handleAddToPurchases = () => {
        if (!selectedRecommendation) return;

        handleMenuClose();
        setOpenAddToPurchasesModal(true);
    };

    const handleClosePurchaseModal = () => {
        setOpenAddToPurchasesModal(false);
    };

    // -----------------------------------------
    // Delete recommendation from server
    // -----------------------------------------
    async function deleteRecommendationFromServer(
        recommendationId
    ) {
        // IMPORTANT:
        // No null body in DELETE requests.
        const response = await serverRequests(
            "DELETE",
            `recommendations/${recommendationId}`
        );

        if (
            !response ||
            typeof response.json !== "function"
        ) {
            throw new Error("לא ניתן להתחבר לשרת");
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "מחיקת ההמלצה נכשלה"
            );
        }

        return data;
    }

    // -----------------------------------------
    // Delete recommendation manually
    // -----------------------------------------
    const handleDeleteRecommendation = () => {
        handleMenuClose();
        setOpenDeleteModal(true);
    };

    const confirmDeleteRecommendation = async () => {
        if (!selectedRecommendation || deleting) {
            return;
        }

        setDeleting(true);

        try {
            const recommendationId =
                selectedRecommendation.recommendation_id;

            await deleteRecommendationFromServer(
                recommendationId
            );

            setRecommendations((previous) =>
                previous.filter(
                    (item) =>
                        item.recommendation_id !==
                        recommendationId
                )
            );

            setOpenDeleteModal(false);
            setSelectedRecommendation(null);

            onSuccess("ההמלצה נמחקה בהצלחה");

        } catch (error) {
            console.error(
                "Error deleting recommendation:",
                error
            );

            onError(
                error.message || "שגיאה במחיקת ההמלצה"
            );

        } finally {
            setDeleting(false);
        }
    };

    // -----------------------------------------
    // Purchase successfully saved
    // Only now remove the recommendation.
    // -----------------------------------------
    const handlePurchaseSuccess = async (message) => {
        const recommendation = selectedRecommendation;

        // The purchase is already saved at this point.
        setOpenAddToPurchasesModal(false);

        onSuccess(message || "הרכישה נוספה בהצלחה");

        if (!recommendation) {
            return;
        }

        try {
            await deleteRecommendationFromServer(
                recommendation.recommendation_id
            );

            setRecommendations((previous) =>
                previous.filter(
                    (item) =>
                        item.recommendation_id !==
                        recommendation.recommendation_id
                )
            );

            setSelectedRecommendation(null);

        } catch (error) {
            console.error(
                "Purchase saved but recommendation removal failed:",
                error
            );

            // Do NOT create another purchase.
            toast.warning(
                "הרכישה נשמרה בהצלחה, אך ההמלצה לא הוסרה."
            );
        }
    };

    // -----------------------------------------
    // Render
    // -----------------------------------------
    return (
        <Box sx={{ p: 3 }} dir="rtl">
            <ToastContainer
                position="top-center"
                rtl
            />

            {/* Add recommendation button */}
            <Tooltip title="הוספת המלצה" arrow>
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={() =>
                        setAddRecommendationModal(true)
                    }
                    sx={{
                        top: "-3%",
                        right: "85%",
                        transform: "translateX(-50%)",
                        backgroundColor: "#B68FFF",
                        color: "#fff",
                        "&:hover": {
                            backgroundColor: "#A256E8"
                        }
                    }}
                >
                    <AddIcon />
                </Fab>
            </Tooltip>

            {/* Add recommendation modal */}
            <Modal
                open={addRecommendationModal}
                onClose={() =>
                    setAddRecommendationModal(false)
                }
            >
                <AddRecommendationModal
                    onClose={() =>
                        setAddRecommendationModal(false)
                    }
                    clientId={clientId}
                    setRecommendations={setRecommendations}
                    onSuccess={onSuccess}
                    onError={onError}
                />
            </Modal>

            {/* Recommendations table */}
            {loading ? (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        p: 4
                    }}
                >
                    <CircularProgress />
                </Box>
            ) : recommendations.length === 0 ? (
                <Typography
                    variant="h6"
                    align="center"
                    sx={{
                        p: 3,
                        color: "text.secondary"
                    }}
                >
                    אין עדיין המלצות
                </Typography>
            ) : (
                <TableContainer
                    component={Paper}
                    sx={{ mt: 3 }}
                >
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
                            {recommendations.map(
                                (recommendation) => (
                                    <TableRow
                                        key={
                                            recommendation.recommendation_id
                                        }
                                        hover
                                    >
                                        <TableCell>
                                            <Avatar
                                                src={
                                                    recommendation.image_path ||
                                                    "/default-product.jpg"
                                                }
                                                variant="square"
                                            />
                                        </TableCell>

                                        <TableCell>
                                            {recommendation.product_name}
                                        </TableCell>

                                        <TableCell>
                                            {Number(
                                                recommendation.product_price
                                            ).toFixed(2)} ₪
                                        </TableCell>

                                        <TableCell>
                                            {recommendation.product_description
                                                ? recommendation.product_description
                                                    .length > 50
                                                    ? `${recommendation.product_description.substring(
                                                        0,
                                                        50
                                                    )}...`
                                                    : recommendation.product_description
                                                : "אין תיאור"}
                                        </TableCell>

                                        <TableCell>
                                            {new Date(
                                                recommendation.created_at
                                            ).toLocaleDateString("he-IL")}
                                        </TableCell>

                                        <TableCell>
                                            <IconButton
                                                onClick={(event) =>
                                                    handleMenuOpen(
                                                        event,
                                                        recommendation
                                                    )
                                                }
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                )
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Recommendation actions */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem
                    onClick={() =>
                        handleNavigate(
                            selectedRecommendation?.product_id
                        )
                    }
                >
                    <FeaturedPlayListIcon sx={{ mr: 1 }} />
                    מעבר לדף המוצר
                </MenuItem>

                <MenuItem onClick={handleAddToPurchases}>
                    <ShoppingCartIcon sx={{ mr: 1 }} />
                    רכישת המוצר
                </MenuItem>

                <MenuItem
                    onClick={handleDeleteRecommendation}
                    sx={{ color: "error.main" }}
                >
                    <DeleteIcon sx={{ mr: 1 }} />
                    מחיקת המלצה
                </MenuItem>
            </Menu>

            {/* Purchase from recommendation */}
            <Modal
                open={openAddToPurchasesModal}
                onClose={handleClosePurchaseModal}
            >
                <AddPurchaseModal
                    onClose={handleClosePurchaseModal}
                    clientId={clientId}
                    userData={userData}
                    initialProduct={
                        selectedRecommendation
                            ? {
                                product_id:
                                    selectedRecommendation.product_id,
                                product_name:
                                    selectedRecommendation.product_name,
                                product_price:
                                    selectedRecommendation.product_price,
                                product_description:
                                    selectedRecommendation.product_description,
                                image_path:
                                    selectedRecommendation.image_path,
                                purchase_count:
                                    selectedRecommendation.purchase_count
                            }
                            : null
                    }
                    onSuccess={handlePurchaseSuccess}
                    onError={onError}
                />
            </Modal>

            {/* Manual delete confirmation */}
            <Dialog
                open={openDeleteModal}
                onClose={() => {
                    if (!deleting) {
                        setOpenDeleteModal(false);
                    }
                }}
                dir="rtl"
            >
                <DialogTitle>
                    האם למחוק את ההמלצה על
                    {" "}
                    {selectedRecommendation?.product_name}
                    ?
                </DialogTitle>

                <DialogActions>
                    <Button
                        disabled={deleting}
                        onClick={() =>
                            setOpenDeleteModal(false)
                        }
                    >
                        ביטול
                    </Button>

                    <Button
                        onClick={confirmDeleteRecommendation}
                        color="error"
                        disabled={deleting}
                    >
                        {deleting ? "מוחק..." : "מחק"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
