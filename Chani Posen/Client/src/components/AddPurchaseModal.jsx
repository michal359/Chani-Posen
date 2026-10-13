
import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Typography,
    IconButton,
    TextField,
    List,
    ListItemButton,
    ListItemText,
    Avatar,
    Alert,
    Switch,
    Divider,
    CircularProgress
} from "@mui/material";
import ProductSelector from "./ProductSelector";
import CloseIcon from "@mui/icons-material/Close";
import { serverRequests } from "../Api";

const toCents = (value) =>
    Math.round(Number(value || 0) * 100);

const formatMoney = (cents) =>
    (cents / 100).toFixed(2);

const validAmount = (value) => {
    if (value === "") return false;

    const number = Number(value);

    return (
        Number.isFinite(number) &&
        number >= 0 &&
        Math.abs(
            number * 100 - Math.round(number * 100)
        ) < 1e-7
    );
};

export default function AddPurchaseModal({
    onClose,
    clientId,
    userData,
    setPurchases,
    onSuccess,
    onError,
    initialProduct = null
}) {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(initialProduct);

    const [specialPriceEnabled, setSpecialPriceEnabled] =
        useState(false);

    const [specialPrice, setSpecialPrice] = useState("");

    const [directAmount, setDirectAmount] = useState("");

    const [useWallet, setUseWallet] = useState(false);
    const [walletAmount, setWalletAmount] = useState("");

    const [walletBalance, setWalletBalance] = useState(null);
    const [walletError, setWalletError] = useState("");

    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingWallet, setLoadingWallet] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Load products
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
                    throw new Error("Cannot load products");
                }

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.message);
                }

                if (active) {
                    setProducts(data.products || []);
                }
            } catch (err) {
                if (active) {
                    setError("שגיאה בטעינת המוצרים");
                }
            } finally {
                if (active) setLoadingProducts(false);
            }
        }

        loadProducts();

        return () => {
            active = false;
        };
    }, []);

    // Popular products first, then alphabetical order.
    const filteredProducts = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return products
            .filter((product) =>
                product.product_name
                    .toLowerCase()
                    .includes(query)
            )
            .sort((a, b) => {
                const popularity =
                    Number(b.purchase_count || 0) -
                    Number(a.purchase_count || 0);

                if (popularity !== 0) return popularity;

                return a.product_name.localeCompare(
                    b.product_name,
                    "he"
                );
            });
    }, [products, searchTerm]);

    function selectProduct(product) {
        setSelectedProduct(product);
        setSpecialPriceEnabled(false);
        setSpecialPrice("");
        setDirectAmount("");
        setWalletAmount("");
        setError("");
    }

    // Fetch the real wallet balance only when requested.
    async function loadWallet() {
        setLoadingWallet(true);
        setWalletError("");
        setWalletBalance(null);

        try {
            const response = await serverRequests(
                "GET",
                `purchases/wallet/${clientId}`,
                null
            );

            if (!response?.ok) {
                throw new Error("Wallet balance unavailable");
            }

            const data = await response.json();

            if (
                !data.success ||
                !validAmount(data.credit_balance)
            ) {
                throw new Error("Invalid wallet response");
            }

            setWalletBalance(toCents(data.credit_balance));
        } catch (err) {
            setWalletError(
                "לא ניתן לטעון את יתרת הארנק כרגע"
            );
        } finally {
            setLoadingWallet(false);
        }
    }

    function handleWalletToggle(checked) {
        setUseWallet(checked);
        setWalletAmount("");
        setWalletError("");
        setWalletBalance(null);

        if (checked) {
            loadWallet();
        }
    }

    const regularPrice = selectedProduct
        ? toCents(selectedProduct.product_price)
        : 0;

    const purchasePrice =
        specialPriceEnabled
            ? validAmount(specialPrice)
                ? toCents(specialPrice)
                : 0
            : regularPrice;

    const directValid =
        directAmount === "" || validAmount(directAmount);

    const walletValid =
        walletAmount === "" || validAmount(walletAmount);

    const priceValid =
        !specialPriceEnabled || validAmount(specialPrice);

    const direct = directValid
        ? toCents(directAmount)
        : 0;

    const wallet =
        useWallet && walletValid
            ? toCents(walletAmount)
            : 0;

    const maxWalletUsable =
        walletBalance === null
            ? 0
            : Math.max(
                0,
                Math.min(walletBalance, purchasePrice)
            );

    const walletReady =
        !useWallet ||
        (
            walletBalance !== null &&
            !loadingWallet &&
            !walletError
        );

    const walletWithinLimit =
        !useWallet || wallet <= maxWalletUsable;

    const appliedPayment = Math.min(
        purchasePrice,
        direct + wallet
    );

    const remainingDebt = Math.max(
        0,
        purchasePrice - appliedPayment
    );

    const excessToWallet = Math.max(
        0,
        direct - Math.max(0, purchasePrice - wallet)
    );

    const canSave =
        selectedProduct &&
        priceValid &&
        directValid &&
        walletValid &&
        walletReady &&
        walletWithinLimit &&
        !saving;

    async function refreshPurchases() {
        if (!setPurchases) return;

        const response = await serverRequests(
            "GET",
            `purchases/client/${clientId}`,
            null
        );

        if (!response?.ok) {
            throw new Error("Failed to refresh purchases");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        setPurchases(data.purchases || []);
    }

    async function handleSave() {
        if (!canSave) return;

        setSaving(true);
        setError("");

        let purchaseCreated = false;

        try {
            const body = {
                clientId,
                productId: selectedProduct.product_id,
                purchasePrice: formatMoney(purchasePrice),
                directAmount: formatMoney(direct),
                walletAmount: formatMoney(wallet)
            };

            const response = await serverRequests(
                "POST",
                "purchases",
                body
            );

            if (!response?.ok) {
                const details = response?.json
                    ? await response.json()
                    : {};

                throw new Error(
                    details.message || "שגיאה בשמירת הרכישה"
                );
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(
                    data.message || "שגיאה בשמירת הרכישה"
                );
            }

            purchaseCreated = true;

            try {
                await refreshPurchases();
            } catch (refreshError) {
                console.warn(refreshError);
            }

            // Notifications are optional and do not affect
            // whether the purchase was saved.
            if (remainingDebt > 0 && userData?.user_id) {
                try {
                    await serverRequests(
                        "POST",
                        "notifications",
                        {
                            user_id: userData.user_id,
                            notification_text:
                                `נותר חוב של ` +
                                `${formatMoney(remainingDebt)} ₪ ` +
                                `ברכישת ${selectedProduct.product_name}`,
                            notification_type: "PRODUCT",
                            entity_type: "PURCHASE",
                            entity_id: data.purchaseId,
                            link: `/clients/${clientId}/products`
                        }
                    );
                } catch (notificationError) {
                    console.warn(notificationError);
                }
            }

            onSuccess?.("הרכישה נשמרה בהצלחה");
            onClose();

        } catch (err) {
            if (!purchaseCreated) {
                setError(
                    err.message || "שגיאה בהוספת הרכישה"
                );
                onError?.(err.message);
            }
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
                width: { xs: "95%", sm: 550 },
                maxHeight: "90vh",
                overflowY: "auto",
                bgcolor: "background.paper",
                boxShadow: 24,
                borderRadius: 2,
                p: 3
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2
                }}
            >
                <Typography variant="h6">
                    הוספת רכישה חדשה
                </Typography>

                <IconButton
                    onClick={onClose}
                    disabled={saving}
                >
                    <CloseIcon />
                </IconButton>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}



            {!initialProduct && (
                <ProductSelector
                    selectedProduct={selectedProduct}
                    onSelect={(product) => {
                        setSelectedProduct(product);
                        setSpecialPriceEnabled(false);
                        setSpecialPrice("");
                        setDirectAmount("");
                        setWalletAmount("");
                        setError("");
                    }}
                    title="בחירת מוצר לרכישה"
                />
            )}



            {selectedProduct && (
                <>
                    <Box
                        sx={{
                            mt: 2,
                            p: 2,
                            bgcolor: "#F7F7F7",
                            borderRadius: 2,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <Typography fontWeight="bold">
                            {selectedProduct.product_name}
                        </Typography>

                        <Typography fontWeight="bold">
                            ₪{formatMoney(regularPrice)}
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mt: 2
                        }}
                    >
                        <Typography>
                            מחיר מיוחד לרכישה זו
                        </Typography>

                        <Switch
                            checked={specialPriceEnabled}
                            onChange={(event) =>
                                setSpecialPriceEnabled(
                                    event.target.checked
                                )
                            }
                        />
                    </Box>

                    {specialPriceEnabled && (
                        <TextField
                            fullWidth
                            type="number"
                            label="מחיר מיוחד"
                            value={specialPrice}
                            onChange={(event) =>
                                setSpecialPrice(event.target.value)
                            }
                            inputProps={{
                                min: 0,
                                step: "0.01"
                            }}
                            sx={{ mt: 1 }}
                        />
                    )}

                    <Divider sx={{ my: 3 }} />

                    <Typography
                        fontWeight="bold"
                        sx={{ mb: 2 }}
                    >
                        תשלום
                    </Typography>

                    <TextField
                        fullWidth
                        type="number"
                        label="סכום ששולם (₪)"
                        value={directAmount}
                        onChange={(event) =>
                            setDirectAmount(event.target.value)
                        }
                        inputProps={{
                            min: 0,
                            step: "0.01"
                        }}
                        helperText="סכום שהלקוחה משלמת כעת"
                    />

                    <Box
                        sx={{
                            mt: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                        }}
                    >
                        <Typography>
                            תשלום מהארנק
                        </Typography>

                        <Switch
                            checked={useWallet}
                            onChange={(event) =>
                                handleWalletToggle(
                                    event.target.checked
                                )
                            }
                        />
                    </Box>

                    {useWallet && (
                        <Box
                            sx={{
                                bgcolor: "#F7F7F7",
                                borderRadius: 2,
                                p: 2,
                                mt: 1
                            }}
                        >
                            {loadingWallet ? (
                                <CircularProgress size={22} />
                            ) : walletError ? (
                                <Alert severity="warning">
                                    {walletError}
                                </Alert>
                            ) : (
                                <>
                                    <Typography>
                                        יתרה בארנק: ₪
                                        {formatMoney(
                                            walletBalance || 0
                                        )}
                                    </Typography>

                                    <Typography
                                        fontWeight="bold"
                                        sx={{ mt: 1, mb: 2 }}
                                    >
                                        ניתן לנצל לרכישה:
                                        {" "}₪
                                        {formatMoney(maxWalletUsable)}
                                    </Typography>

                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="סכום מהארנק"
                                        value={walletAmount}
                                        onChange={(event) =>
                                            setWalletAmount(
                                                event.target.value
                                            )
                                        }
                                        inputProps={{
                                            min: 0,
                                            step: "0.01"
                                        }}
                                        error={!walletWithinLimit}
                                        helperText={
                                            !walletWithinLimit
                                                ? "הסכום גבוה מהיתרה הזמינה"
                                                : ""
                                        }
                                    />
                                </>
                            )}
                        </Box>
                    )}

                    <Divider sx={{ my: 3 }} />

                    <Box
                        sx={{
                            bgcolor: "#F7F7F7",
                            borderRadius: 2,
                            p: 2
                        }}
                    >
                        <Typography fontWeight="bold" mb={1}>
                            סיכום רכישה
                        </Typography>

                        <Typography>
                            מחיר רכישה:
                            {" "}₪{formatMoney(purchasePrice)}
                        </Typography>

                        <Typography>
                            סכום ששולם:
                            {" "}₪{formatMoney(appliedPayment)}
                        </Typography>

                        <Typography
                            fontWeight="bold"
                            color={
                                remainingDebt > 0
                                    ? "error.main"
                                    : "success.main"
                            }
                        >
                            יתרת חוב:
                            {" "}₪{formatMoney(remainingDebt)}
                        </Typography>

                        {excessToWallet > 0 && (
                            <Alert
                                severity="success"
                                sx={{ mt: 2 }}
                            >
                                עודף של ₪
                                {formatMoney(excessToWallet)}
                                {" "}יועבר לארנק
                            </Alert>
                        )}
                    </Box>

                    <Box
                        sx={{
                            mt: 3,
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 2
                        }}
                    >
                        <Button
                            onClick={onClose}
                            disabled={saving}
                        >
                            ביטול
                        </Button>

                        <Button
                            variant="contained"
                            disabled={!canSave}
                            onClick={handleSave}
                            sx={{
                                bgcolor: "#B68FFF",
                                "&:hover": {
                                    bgcolor: "#A256E8"
                                }
                            }}
                        >
                            {saving
                                ? <CircularProgress
                                    size={20}
                                    color="inherit"
                                />
                                : "שמירה"}
                        </Button>
                    </Box>
                </>
            )}
        </Box>
    );
}
