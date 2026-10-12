
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
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Tooltip,
    Dialog,
    DialogActions,
    DialogTitle,
    DialogContent,
    Button,
    CircularProgress
} from "@mui/material";

import { serverRequests } from "../Api";

import FeaturedPlayListIcon from "@mui/icons-material/FeaturedPlayList";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import Fab from "@mui/material/Fab";

import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import EditClientPurchaseStatusModal from "./EditClientPurchaseStatusModal";
import AddPurchaseModal from "./AddPurchaseModal";

// Convert monetary values to cents for exact calculations.
function toCents(value) {
    const number = Number(value ?? 0);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.round(number * 100);
}

function formatMoney(value) {
    return (toCents(value) / 100).toFixed(2);
}

// Calculate financial status from the actual purchase data.
function getPurchaseFinancials(purchase) {
    const price = toCents(
        purchase.purchase_price ?? purchase.product_price
    );

    const paid = toCents(purchase.amount_paid);

    const debt = Math.max(0, price - paid);

    return {
        price,
        paid,
        debt,
        isPaid: debt === 0
    };
}

export default function ClientPurchases({
    clientId,
    userData
}) {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);

    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [openEditModal, setOpenEditModal] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [addPurchaseModal, setAddPurchaseModal] = useState(false);

    const [deleting, setDeleting] = useState(false);

    const navigate = useNavigate();

    // -----------------------------------------------
    // Load purchases
    // -----------------------------------------------
    const loadPurchases = useCallback(async () => {
        try {
            const response = await serverRequests(
                "GET",
                `purchases/client/${clientId}`,
                null
            );

            if (!response?.ok) {
                throw new Error("Failed to load purchases");
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(
                    data.message || "Failed to load purchases"
                );
            }

            const sorted = [...(data.purchases || [])].sort(
                (a, b) => {
                    const dateDifference =
                        new Date(b.purchase_date) -
                        new Date(a.purchase_date);

                    if (dateDifference !== 0) {
                        return dateDifference;
                    }

                    return b.purchase_id - a.purchase_id;
                }
            );

            setPurchases(sorted);

        } catch (error) {
            console.error("Error fetching purchases:", error);
            toast.error("שגיאה בטעינת הרכישות");

        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        setLoading(true);
        loadPurchases();
    }, [loadPurchases]);

    // -----------------------------------------------
    // Menu actions
    // -----------------------------------------------
    const handleMenuOpen = (event, purchase) => {
        setAnchorEl(event.currentTarget);
        setSelectedProduct(purchase);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleNavigate = (productId) => {
        handleMenuClose();
        navigate(`/admin-home/products/${productId}`);
    };

    const handleEditPayment = () => {
        handleMenuClose();
        setOpenEditModal(true);
    };

    const handleDeletePurchase = () => {
        handleMenuClose();

        if (!selectedProduct) return;

        const financials =
            getPurchaseFinancials(selectedProduct);

        if (financials.paid > 0) {
            toast.error(
                "לא ניתן למחוק רכישה שכבר בוצע עבורה תשלום"
            );
            return;
        }

        setOpenDeleteModal(true);
    };

    const onSuccess = (message) => {
        toast.success(message);
    };

    const onError = (message) => {
        toast.error(message);
    };

    // -----------------------------------------------
    // Delete unpaid purchase
    // -----------------------------------------------

    const confirmDeletePurchase = async () => {
        if (!selectedProduct || deleting) return;

        setDeleting(true);

        try {
            const response = await serverRequests(
                "DELETE",
                `purchases/${selectedProduct.purchase_id}`
            );

            if (!response || !response.ok) {
                let message = "שגיאה במחיקת הרכישה";

                if (typeof response?.json === "function") {
                    const errorData = await response.json()
                        .catch(() => null);

                    message = errorData?.message || message;
                }

                throw new Error(message);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(
                    data.message || "לא ניתן למחוק את הרכישה"
                );
            }

            toast.success("הרכישה נמחקה בהצלחה");

            setOpenDeleteModal(false);
            setSelectedProduct(null);

            await loadPurchases();

        } catch (error) {
            console.error("Error deleting purchase:", error);

            toast.error(
                error.message || "שגיאה במחיקת הרכישה"
            );

        } finally {
            setDeleting(false);
        }
    };



    // -----------------------------------------------
    // Render
    // -----------------------------------------------
    return (
        <Box sx={{ p: 3 }} dir="rtl">
            <ToastContainer
                position="top-center"
                rtl
            />

            <Tooltip title="הוספת רכישה" arrow>
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={() => setAddPurchaseModal(true)}
                    sx={{
                        top: "-3%",
                        right: "85%",
                        transform: "translateX(-50%)",
                        backgroundColor: "#B68FFF",
                        color: "#fff",
                        "&:hover": {
                            backgroundColor: "#A256E8"
                        },
                        order: { xs: 1, sm: 0 }
                    }}
                >
                    <AddIcon />
                </Fab>
            </Tooltip>

            {/* Add purchase modal */}
            <Modal
                open={addPurchaseModal}
                onClose={() => setAddPurchaseModal(false)}
            >
                <AddPurchaseModal
                    onClose={() => setAddPurchaseModal(false)}
                    clientId={clientId}
                    userData={userData}
                    setPurchases={setPurchases}
                    onSuccess={async (message) => {
                        onSuccess(message);
                        await loadPurchases();
                    }}
                    onError={onError}
                />
            </Modal>

            {/* Purchases table */}
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
            ) : purchases.length === 0 ? (
                <Typography
                    variant="h6"
                    align="center"
                    sx={{
                        p: 3,
                        color: "text.secondary"
                    }}
                >
                    אין עדיין רכישות
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
                                <TableCell align="center">
                                    מחיר רכישה
                                </TableCell>
                                <TableCell>תיאור</TableCell>
                                <TableCell>תאריך רכישה</TableCell>

                                <TableCell align="center">
                                    שולם
                                </TableCell>

                                <TableCell align="center">
                                    חוב
                                </TableCell>

                                <TableCell align="center">
                                    פעולות
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {purchases.map((purchase) => {
                                const financials =
                                    getPurchaseFinancials(purchase);

                                return (
                                    <TableRow
                                        key={purchase.purchase_id}
                                        hover
                                    >
                                        <TableCell>
                                            <Avatar
                                                src={
                                                    purchase.image_path ||
                                                    "/default-product.jpg"
                                                }
                                                variant="square"
                                            />
                                        </TableCell>

                                        <TableCell>
                                            {purchase.product_name}
                                        </TableCell>

                                        <TableCell align="center">
                                            {formatMoney(
                                                financials.price / 100
                                            )} ₪
                                        </TableCell>

                                        <TableCell>
                                            {purchase.product_description
                                                ? purchase.product_description
                                                    .length > 50
                                                    ? `${purchase.product_description
                                                        .substring(0, 50)
                                                    }...`
                                                    : purchase.product_description
                                                : "אין תיאור"
                                            }
                                        </TableCell>

                                        <TableCell>
                                            {new Date(
                                                purchase.purchase_date
                                            ).toLocaleDateString("he-IL")}
                                        </TableCell>

                                        {/* Amount already paid */}
                                        <TableCell align="center">
                                            {formatMoney(
                                                financials.paid / 100
                                            )} ₪
                                        </TableCell>

                                        {/* Debt exactly like treatments */}
                                        <TableCell align="center">
                                            {financials.debt > 0 ? (
                                                <Chip
                                                    label={
                                                        `חוב ${formatMoney(
                                                            financials.debt / 100
                                                        )
                                                        } ₪`
                                                    }
                                                    color="error"
                                                    variant="outlined"
                                                    sx={{
                                                        fontWeight: "bold"
                                                    }}
                                                />
                                            ) : (
                                                <Chip
                                                    label="שולם"
                                                    color="success"
                                                    variant="outlined"
                                                />
                                            )}
                                        </TableCell>

                                        <TableCell align="center">
                                            <IconButton
                                                onClick={(event) =>
                                                    handleMenuOpen(
                                                        event,
                                                        purchase
                                                    )
                                                }
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Actions menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem
                    onClick={() =>
                        handleNavigate(
                            selectedProduct?.product_id
                        )
                    }
                >
                    <FeaturedPlayListIcon sx={{ mr: 1 }} />
                    מעבר לדף המוצר
                </MenuItem>

                <MenuItem onClick={handleEditPayment}>
                    <EditIcon sx={{ mr: 1 }} />
                    עריכת תשלום
                </MenuItem>


                {selectedProduct &&
                    Number(selectedProduct.amount_paid) === 0 && (
                        <MenuItem
                            onClick={handleDeletePurchase}
                            sx={{ color: "error.main" }}
                        >
                            <DeleteIcon sx={{ mr: 1 }} />
                            מחיקת רכישה
                        </MenuItem>
                    )
                }

            </Menu>

            {/* Edit payment modal */}
            {openEditModal && selectedProduct && (
                <EditClientPurchaseStatusModal
                    open={openEditModal}
                    onClose={() => {
                        setOpenEditModal(false);
                        setSelectedProduct(null);
                    }}
                    purchase={selectedProduct}
                    purchases={purchases}
                    setPurchases={setPurchases}
                    onSuccess={async (message) => {
                        onSuccess(message);
                        await loadPurchases();
                    }}
                    onError={onError}
                />
            )}

            {/* Delete confirmation */}
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
                    מחיקת רכישה
                </DialogTitle>

                <DialogContent>
                    <Typography>
                        האם למחוק את הרכישה של{" "}
                        <strong>
                            {selectedProduct?.product_name}
                        </strong>
                        ?
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                    >
                        לא ניתן למחוק רכישה שבוצע עבורה תשלום.
                    </Typography>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() => setOpenDeleteModal(false)}
                        disabled={deleting}
                    >
                        ביטול
                    </Button>

                    <Button
                        onClick={confirmDeletePurchase}
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
