
import React, { useEffect, useState } from "react";
import {
    Box,
    Button,
    Typography,
    Modal,
    Chip,
    IconButton,
    TextField,
    Switch,
    Divider,
    Alert,
    CircularProgress
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import { serverRequests } from "../Api";

const toCents = (value) =>
    Math.round(Number(value || 0) * 100);

const formatMoney = (value) =>
    (value / 100).toFixed(2);

function validMoney(value) {
    if (value === "") return true;

    const number = Number(value);

    return (
        Number.isFinite(number) &&
        number >= 0 &&
        Math.abs(
            number * 100 - Math.round(number * 100)
        ) < 1e-7
    );
}

export default function EditClientPurchaseStatusModal({
    open,
    onClose,
    purchase,
    purchases,
    setPurchases,
    onSuccess,
    onError
}) {
    const [directAmount, setDirectAmount] = useState("");
    const [walletAmount, setWalletAmount] = useState("");
    const [useWallet, setUseWallet] = useState(false);

    const [walletBalance, setWalletBalance] = useState(null);
    const [loadingWallet, setLoadingWallet] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const price = toCents(
        purchase?.purchase_price ?? purchase?.product_price
    );

    const alreadyPaid = toCents(purchase?.amount_paid);
    const currentDebt = Math.max(0, price - alreadyPaid);

    const directValid = validMoney(directAmount);
    const walletValid = validMoney(walletAmount);

    const direct = directValid
        ? toCents(directAmount)
        : 0;

    const wallet = walletValid && useWallet
        ? toCents(walletAmount)
        : 0;

    // Wallet funds may cover only the remaining debt.
    const maxWalletUsable = walletBalance === null
        ? 0
        : Math.min(walletBalance, currentDebt);

    const walletWithinLimit =
        !useWallet || wallet <= maxWalletUsable;

    const paymentApplied = Math.min(
        currentDebt,
        direct + wallet
    );

    const newDebt = Math.max(
        0,
        currentDebt - paymentApplied
    );

    // Only extra direct money goes into the wallet.
    const excessToWallet = Math.max(
        0,
        direct - Math.max(currentDebt - wallet, 0)
    );

    const walletReady =
        !useWallet ||
        (walletBalance !== null && !loadingWallet);

    const canSave =
        !loading &&
        directValid &&
        walletValid &&
        walletWithinLimit &&
        walletReady &&
        (direct > 0 || wallet > 0);

    // Reset form when changing purchases.
    useEffect(() => {
        if (open) {
            setDirectAmount("");
            setWalletAmount("");
            setUseWallet(false);
            setWalletBalance(null);
            setError("");
        }
    }, [open, purchase?.purchase_id]);

    // Read updated wallet balance.
    useEffect(() => {
        if (!open || !useWallet || !purchase?.client_id) {
            return;
        }

        let active = true;

        async function fetchWallet() {
            setLoadingWallet(true);
            setWalletBalance(null);

            try {
                const response = await serverRequests(
                    "GET",
                    `purchases/wallet/${purchase.client_id}`,
                    null
                );

                if (!response?.ok) {
                    throw new Error(
                        "לא ניתן לקבל את יתרת הארנק"
                    );
                }

                const data = await response.json();

                if (
                    !data.success ||
                    data.credit_balance == null ||
                    !validMoney(String(data.credit_balance))
                ) {
                    throw new Error(
                        "התקבלה יתרת ארנק לא תקינה"
                    );
                }

                if (active) {
                    setWalletBalance(
                        toCents(data.credit_balance)
                    );
                }

            } catch (err) {
                if (active) {
                    setError(err.message);
                }
            } finally {
                if (active) {
                    setLoadingWallet(false);
                }
            }
        }

        fetchWallet();

        return () => {
            active = false;
        };
    }, [
        open,
        useWallet,
        purchase?.client_id
    ]);

    function closeModal() {
        if (!loading) {
            onClose();
        }
    }

    async function handleSavePayment() {
        if (!canSave) return;

        setLoading(true);
        setError("");

        try {
            const response = await serverRequests(
                "PUT",
                `purchases/${purchase.purchase_id}`,
                {
                    directAmount: formatMoney(direct),
                    walletAmount: formatMoney(wallet)
                }
            );

            if (
                !response ||
                typeof response.json !== "function"
            ) {
                throw new Error(
                    "לא ניתן להתחבר לשרת"
                );
            }

            const data = await response.json()
                .catch(() => null);

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message ||
                    "שגיאה בשמירת התשלום"
                );
            }

            // Immediately update the visible purchase.
            // The parent will also refresh it from the server.
            if (
                typeof setPurchases === "function"
            ) {
                const updatedPaid =
                    Number(data.amountPaid);

                if (Number.isFinite(updatedPaid)) {
                    setPurchases((previous) =>
                        previous.map((item) =>
                            item.purchase_id ===
                            purchase.purchase_id
                                ? {
                                    ...item,
                                    amount_paid: updatedPaid
                                }
                                : item
                        )
                    );
                }
            }

            closeAfterSuccess();

            if (typeof onSuccess === "function") {
                onSuccess("התשלום נשמר בהצלחה");
            }

        } catch (err) {
            console.error(
                "Error updating purchase payment:",
                err
            );

            setError(
                err.message || "שגיאה בשמירת התשלום"
            );

        } finally {
            setLoading(false);
        }
    }

    function closeAfterSuccess() {
        onClose();
    }

    return (
        <Modal
            open={open}
            onClose={closeModal}
        >
            <Box
                dir="rtl"
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: { xs: "94%", sm: 440 },
                    maxHeight: "90vh",
                    overflowY: "auto",
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 3,
                    borderRadius: 2,
                    boxSizing: "border-box"
                }}
            >
                <IconButton
                    onClick={closeModal}
                    disabled={loading}
                    sx={{
                        position: "absolute",
                        left: 8,
                        top: 8
                    }}
                >
                    <CloseIcon />
                </IconButton>
                <br/>
                <Typography
                    variant="h6"
                    sx={{ mb: 2 }}
                >
                    עדכון תשלום רכישה
                </Typography>

                <Typography
                    fontWeight="bold"
                    sx={{ mb: 2 }}
                >
                    {purchase?.product_name}
                </Typography>

                {error && (
                    <Alert
                        severity="error"
                        sx={{ mb: 2 }}
                    >
                        {error}
                    </Alert>
                )}

                <Box
                    sx={{
                        p: 2,
                        bgcolor: "#F7F7F7",
                        borderRadius: 2
                    }}
                >
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        mb={1}
                    >
                        <Typography>מחיר הרכישה</Typography>
                        <Typography fontWeight="bold">
                            {formatMoney(price)} ₪
                        </Typography>
                    </Box>

                    <Box
                        display="flex"
                        justifyContent="space-between"
                        mb={2}
                    >
                        <Typography>כבר שולם</Typography>
                        <Typography>
                            {formatMoney(alreadyPaid)} ₪
                        </Typography>
                    </Box>

                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Typography>חוב נוכחי</Typography>

                        <Chip
                            label={
                                currentDebt === 0
                                    ? "שולם"
                                    : `חוב ${formatMoney(currentDebt)} ₪`
                            }
                            color={
                                currentDebt === 0
                                    ? "success"
                                    : "error"
                            }
                            variant="outlined"
                        />
                    </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography
                    fontWeight="bold"
                    sx={{ mb: 2 }}
                >
                    הוספת תשלום חדש
                </Typography>

                <TextField
                    fullWidth
                    type="number"
                    label="סכום ששולם כעת (₪)"
                    value={directAmount}
                    onChange={(event) =>
                        setDirectAmount(event.target.value)
                    }
                    inputProps={{
                        min: 0,
                        step: "0.01"
                    }}
                    error={!directValid}
                    helperText={
                        "תשלום חדש בלבד, לא הסכום המצטבר"
                    }
                />

                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mt: 2 }}
                >
                    <Typography>
                        תשלום מהארנק
                    </Typography>

                    <Switch
                        checked={useWallet}
                        disabled={loading}
                        onChange={(event) => {
                            setUseWallet(
                                event.target.checked
                            );
                            setWalletAmount("");
                            setError("");
                        }}
                    />
                </Box>

                {useWallet && (
                    <Box
                        sx={{
                            mt: 1,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "#F7F7F7"
                        }}
                    >
                        {loadingWallet ? (
                            <CircularProgress size={22} />
                        ) : walletBalance !== null ? (
                            <>
                                <Typography>
                                    יתרה בארנק:
                                    {" "}
                                    <strong>
                                        {formatMoney(
                                            walletBalance
                                        )} ₪
                                    </strong>
                                </Typography>

                                <Typography
                                    sx={{ mt: 1, mb: 2 }}
                                >
                                    ניתן לנצל לתשלום:
                                    {" "}
                                    <strong>
                                        {formatMoney(
                                            maxWalletUsable
                                        )} ₪
                                    </strong>
                                </Typography>

                                <TextField
                                    fullWidth
                                    type="number"
                                    label="סכום מהארנק (₪)"
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
                                    error={
                                        !walletValid ||
                                        !walletWithinLimit
                                    }
                                    helperText={
                                        !walletWithinLimit
                                            ? "הסכום גבוה מהסכום הזמין"
                                            : ""
                                    }
                                />
                            </>
                        ) : (
                            <Typography color="error">
                                יתרת הארנק אינה זמינה
                            </Typography>
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
                    <Typography
                        fontWeight="bold"
                        sx={{ mb: 2 }}
                    >
                        סיכום לאחר התשלום
                    </Typography>

                    <Box
                        display="flex"
                        justifyContent="space-between"
                        mb={1}
                    >
                        <Typography>
                            תשלום חדש לרכישה
                        </Typography>

                        <Typography>
                            {formatMoney(paymentApplied)} ₪
                        </Typography>
                    </Box>

                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Typography>
                            חוב לאחר התשלום
                        </Typography>

                        <Chip
                            label={
                                newDebt === 0
                                    ? "שולם"
                                    : `חוב ${formatMoney(newDebt)} ₪`
                            }
                            color={
                                newDebt === 0
                                    ? "success"
                                    : "error"
                            }
                            variant="outlined"
                        />
                    </Box>

                    {excessToWallet > 0 && (
                        <Alert
                            severity="success"
                            sx={{ mt: 2 }}
                        >
                            עודף של
                            {" "}
                            {formatMoney(excessToWallet)}
                            {" "}₪ יועבר לארנק
                        </Alert>
                    )}
                </Box>

                <Box
                    display="flex"
                    justifyContent="flex-end"
                    gap={2}
                    sx={{ mt: 3 }}
                >
                    <Button
                        onClick={closeModal}
                        disabled={loading}
                    >
                        ביטול
                    </Button>

                    <Button
                        variant="contained"
                        disabled={!canSave}
                        onClick={handleSavePayment}
                        sx={{
                            bgcolor: "#B68FFF",
                            "&:hover": {
                                bgcolor: "#A256E8"
                            }
                        }}
                    >
                        {loading
                            ? <CircularProgress
                                size={20}
                                color="inherit"
                              />
                            : "שמירת תשלום"}
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}
