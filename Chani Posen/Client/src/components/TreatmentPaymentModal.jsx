
import React, { useEffect, useState } from "react";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Box,
    TextField,
    Button,
    Switch,
    Chip,
    Alert,
    CircularProgress,
    Divider
} from "@mui/material";

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
            number * 100 -
            Math.round(number * 100)
        ) < 1e-7
    );
}

export default function TreatmentPaymentModal({
    open,
    onClose,
    treatment,
    clientId,
    onSuccess,
    onError
}) {
    const [directAmount, setDirectAmount] =
        useState("");

    const [walletAmount, setWalletAmount] =
        useState("");

    const [useWallet, setUseWallet] =
        useState(false);

    const [walletBalance, setWalletBalance] =
        useState(null);

    const [loadingWallet, setLoadingWallet] =
        useState(false);

    const [walletError, setWalletError] =
        useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Reset when opening for another treatment
    useEffect(() => {
        if (!open) return;

        setDirectAmount("");
        setWalletAmount("");
        setUseWallet(false);
        setWalletBalance(null);
        setWalletError("");
        setError("");
    }, [open, treatment?.treatment_id]);

    // Load wallet balance when requested

    useEffect(() => {
        if (!open || !useWallet) return;

        const id = clientId ?? treatment?.client_id;

        if (!id) {
            setWalletBalance(null);
            setWalletError("לא נמצא מזהה לקוח");
            return;
        }

        let active = true;

        async function loadWallet() {
            setLoadingWallet(true);
            setWalletError("");
            setWalletBalance(null);

            try {
                const response = await serverRequests(
                    "GET",
                    `purchases/wallet/${id}`
                );

                if (!response || typeof response.json !== "function") {
                    throw new Error("לא ניתן להתחבר לשרת");
                }

                const data = await response.json();

                if (!response.ok || data.success !== true) {
                    throw new Error(
                        data.message || "שגיאה בטעינת הארנק"
                    );
                }

                const balance = Number(data.credit_balance);

                if (
                    data.credit_balance == null ||
                    !Number.isFinite(balance) ||
                    balance < 0
                ) {
                    throw new Error("יתרת הארנק אינה תקינה");
                }

                if (active) {
                    setWalletBalance(Math.round(balance * 100));
                }

            } catch (err) {
                if (active) {
                    setWalletError(err.message);
                }
            } finally {
                if (active) {
                    setLoadingWallet(false);
                }
            }
        }

        loadWallet();

        return () => {
            active = false;
        };
    }, [open, useWallet, clientId, treatment?.client_id]);


    // Financial calculations
    const price = toCents(
        treatment?.treatment_price
    );

    const alreadyPaid = toCents(
        treatment?.amount_paid
    );

    const currentDebt = Math.max(
        0,
        price - alreadyPaid
    );

    const directValid = validMoney(directAmount);
    const walletValid = validMoney(walletAmount);

    const direct = directValid
        ? toCents(directAmount)
        : 0;

    const wallet = useWallet && walletValid
        ? toCents(walletAmount)
        : 0;

    const maxWalletUsable =
        walletBalance === null
            ? 0
            : Math.min(walletBalance, currentDebt);

    const walletWithinLimit =
        !useWallet || wallet <= maxWalletUsable;

    const walletReady =
        !useWallet ||
        (
            walletBalance !== null &&
            !loadingWallet &&
            !walletError
        );

    const appliedPayment = Math.min(
        currentDebt,
        direct + wallet
    );

    const newDebt = Math.max(
        0,
        currentDebt - appliedPayment
    );

    const excessToWallet = Math.max(
        0,
        direct - Math.max(
            0,
            currentDebt - wallet
        )
    );

    const walletAfterPayment =
        walletBalance === null
            ? null
            : walletBalance - wallet + excessToWallet;

    const canSave =
        Boolean(treatment?.treatment_id) &&
        currentDebt > 0 &&
        directValid &&
        walletValid &&
        walletWithinLimit &&
        walletReady &&
        (direct > 0 || wallet > 0) &&
        !saving;

    function handleClose() {
        if (!saving) {
            onClose?.();
        }
    }

    // Save a NEW payment
    async function handleSave() {
        if (!canSave) return;

        setSaving(true);
        setError("");

        try {
            const response = await serverRequests(
                "POST",
                `treatments/${treatment.treatment_id}/payments`,
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

            if (!response.ok || data?.success !== true) {
                throw new Error(
                    data?.message ||
                    "שגיאה בשמירת התשלום"
                );
            }

            onSuccess?.(
                "התשלום נשמר בהצלחה"
            );

            onClose?.();

        } catch (err) {
            console.error(
                "Error saving treatment payment:",
                err
            );

            const message =
                err.message || "שגיאה בשמירת התשלום";

            setError(message);
            onError?.(message);

        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="xs"
            dir="rtl"
        >
            <DialogTitle>
                הוספת תשלום לטיפול
            </DialogTitle>

            <DialogContent dividers>
                <Typography
                    fontWeight="bold"
                    sx={{ mb: 2 }}
                >
                    {treatment?.treatment_name ||
                        treatment?.treatment_type}
                </Typography>

                {error && (
                    <Alert
                        severity="error"
                        sx={{ mb: 2 }}
                    >
                        {error}
                    </Alert>
                )}

                {/* Current financial status */}
                <Box
                    sx={{
                        bgcolor: "#F7F7F7",
                        p: 2,
                        borderRadius: 2
                    }}
                >
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        mb={1}
                    >
                        <Typography>
                            מחיר הטיפול
                        </Typography>

                        <Typography fontWeight="bold">
                            {formatMoney(price)} ₪
                        </Typography>
                    </Box>

                    <Box
                        display="flex"
                        justifyContent="space-between"
                        mb={2}
                    >
                        <Typography>
                            כבר שולם
                        </Typography>

                        <Typography>
                            {formatMoney(alreadyPaid)} ₪
                        </Typography>
                    </Box>

                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Typography>
                            חוב נוכחי
                        </Typography>

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

                {currentDebt === 0 ? (
                    <Alert
                        severity="success"
                        sx={{ mt: 2 }}
                    >
                        הטיפול כבר שולם במלואו.
                        אין יתרת חוב לתשלום.
                    </Alert>
                ) : (
                    <>
                        <Divider sx={{ my: 3 }} />

                        <Typography
                            fontWeight="bold"
                            mb={2}
                        >
                            תשלום חדש
                        </Typography>

                        <TextField
                            fullWidth
                            type="number"
                            label="סכום ששולם כעת (₪)"
                            value={directAmount}
                            onChange={(e) =>
                                setDirectAmount(e.target.value)
                            }
                            inputProps={{
                                min: 0,
                                step: "0.01"
                            }}
                            error={!directValid}
                            helperText={
                                "סכום חדש בלבד, לא הסכום המצטבר"
                            }
                            disabled={saving}
                        />

                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mt={2}
                        >
                            <Typography>
                                תשלום מהארנק
                            </Typography>

                            <Switch
                                checked={useWallet}
                                disabled={saving}
                                onChange={(e) => {
                                    setUseWallet(e.target.checked);
                                    setWalletAmount("");
                                    setWalletError("");
                                }}
                            />
                        </Box>

                        {useWallet && (
                            <Box
                                sx={{
                                    bgcolor: "#F7F7F7",
                                    p: 2,
                                    borderRadius: 2,
                                    mt: 1
                                }}
                            >
                                {loadingWallet ? (
                                    <CircularProgress size={22} />
                                ) : walletError ? (
                                    <Alert severity="error">
                                        {walletError}
                                    </Alert>
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
                                            ניתן לנצל:
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
                                            onChange={(e) =>
                                                setWalletAmount(
                                                    e.target.value
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
                                                    ? "הסכום גבוה מהיתרה הזמינה"
                                                    : ""
                                            }
                                            disabled={saving}
                                        />
                                    </>
                                ) : (
                                    <Alert severity="warning">
                                        לא ניתן להציג את יתרת הארנק.
                                        נסה לסגור ולפתוח את החלון מחדש.
                                    </Alert>
                                )}

                            </Box>
                        )}

                        <Divider sx={{ my: 3 }} />

                        <Box
                            sx={{
                                bgcolor: "#F7F7F7",
                                p: 2,
                                borderRadius: 2
                            }}
                        >
                            <Typography
                                fontWeight="bold"
                                mb={2}
                            >
                                סיכום לאחר התשלום
                            </Typography>

                            <Box
                                display="flex"
                                justifyContent="space-between"
                                mb={1}
                            >
                                <Typography>
                                    תשלום חדש לטיפול
                                </Typography>

                                <Typography>
                                    {formatMoney(appliedPayment)} ₪
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
                                    {" "}₪ יועבר לארנק.
                                </Alert>
                            )}

                            {useWallet &&
                                walletAfterPayment !== null &&
                                walletWithinLimit && (
                                    <Typography
                                        variant="body2"
                                        sx={{ mt: 2 }}
                                    >
                                        יתרה צפויה בארנק:
                                        {" "}
                                        <strong>
                                            {formatMoney(
                                                walletAfterPayment
                                            )} ₪
                                        </strong>
                                    </Typography>
                                )}
                        </Box>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={handleClose}
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
                    {saving ? (
                        <CircularProgress
                            size={20}
                            color="inherit"
                        />
                    ) : (
                        "שמירת תשלום"
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
