
import React, { useEffect, useState } from "react";
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    TextField,
    Button,
    Chip,
    Switch,
    Alert,
    Divider,
    CircularProgress
} from "@mui/material";

import { serverRequests } from "../Api";

const toCents = (value) =>
    Math.round(Number(value || 0) * 100);

const money = (value) =>
    (value / 100).toFixed(2);

function validMoney(value) {
    if (value === "" || value === null || value === undefined) {
        return false;
    }

    const n = Number(value);

    return Number.isFinite(n) &&
        n >= 0 &&
        Math.abs(n * 100 - Math.round(n * 100)) < 1e-7;
}

export default function AddTreatmentModal({
    open,
    onClose,
    onSave,
    clientId,
    newTreatment,
    setNewTreatment,
    treatmentTypes = [],
    errors = {},
    saving = false
}) {
    const [useWallet, setUseWallet] = useState(false);
    const [walletBalance, setWalletBalance] = useState(null);
    const [loadingWallet, setLoadingWallet] = useState(false);
    const [walletError, setWalletError] = useState("");

    const updateField = (field, value) => {
        setNewTreatment((previous) => ({
            ...previous,
            [field]: value
        }));
    };

    // Reset wallet UI when the modal closes.
    useEffect(() => {
        if (open) return;

        setUseWallet(false);
        setWalletBalance(null);
        setWalletError("");
        setLoadingWallet(false);
    }, [open]);

    // Load the real wallet balance.
    useEffect(() => {
        if (!open || !useWallet) return;

        let active = true;

        async function loadWallet() {
            setLoadingWallet(true);
            setWalletBalance(null);
            setWalletError("");

            try {
                if (!clientId) {
                    throw new Error("מזהה לקוח חסר");
                }

                const response = await serverRequests(
                    "GET",
                    `purchases/wallet/${clientId}`
                );

                if (
                    !response ||
                    typeof response.json !== "function"
                ) {
                    throw new Error("לא ניתן להתחבר לשרת");
                }

                const data = await response.json();

                if (!response.ok || data.success !== true) {
                    throw new Error(
                        data.message || "שגיאה בטעינת הארנק"
                    );
                }

                if (!validMoney(data.credit_balance)) {
                    throw new Error("יתרת הארנק אינה תקינה");
                }

                if (active) {
                    setWalletBalance(
                        toCents(data.credit_balance)
                    );
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
    }, [open, useWallet, clientId]);

    // Select treatment type.
    function selectTreatmentType(type) {
        setNewTreatment((previous) => ({
            ...previous,
            treatment_type_id: type.treatment_type_id,
            type: type.treatment_name,
            default_price: type.default_price,
            default_duration: type.default_duration,
            duration: type.default_duration || previous.duration,
            treatment_price: type.default_price,
            is_special_price: false,
            price_note: "",
            walletAmount: ""
        }));
    }


    function toggleSpecialPrice(checked) {
        setNewTreatment((previous) => ({
            ...previous,
            is_special_price: checked,
            treatment_price: checked
                ? previous.treatment_price
                : previous.default_price,
            price_note: checked ? previous.price_note : "",
            walletAmount: ""
        }));
    }


    function toggleWallet(checked) {
        setUseWallet(checked);
        updateField("walletAmount", "");
        setWalletBalance(null);
        setWalletError("");
    }

    // Financial calculations.
    const priceInput = newTreatment.is_special_price
        ? newTreatment.treatment_price
        : newTreatment.default_price;

    const priceValid = validMoney(priceInput);
    const price = priceValid ? toCents(priceInput) : 0;

    const directInput = newTreatment.payment_amount ?? "";
    const walletInput = newTreatment.walletAmount ?? "";

    const directValid =
        directInput === "" || validMoney(directInput);

    const walletValid =
        walletInput === "" || validMoney(walletInput);

    const direct = directValid
        ? toCents(directInput)
        : 0;

    const fromWallet =
        useWallet && walletValid
            ? toCents(walletInput)
            : 0;

    const maxWalletUsable =
        walletBalance === null
            ? 0
            : Math.min(walletBalance, price);

    const walletWithinLimit =
        !useWallet || fromWallet <= maxWalletUsable;

    const walletReady =
        !useWallet ||
        (
            walletBalance !== null &&
            !loadingWallet &&
            !walletError
        );

    const appliedPayment = Math.min(
        price,
        direct + fromWallet
    );

    const debt = Math.max(
        0,
        price - appliedPayment
    );

    const excess = Math.max(
        0,
        direct - Math.max(price - fromWallet, 0)
    );

    const walletAfter =
        walletBalance === null
            ? null
            : walletBalance - fromWallet + excess;

    const paymentValid =
        priceValid &&
        directValid &&
        walletValid &&
        walletWithinLimit &&
        walletReady;

    function handleSave() {
        if (!paymentValid || saving) return;

        onSave?.({
            walletAmount: useWallet
                ? money(fromWallet)
                : "0.00"
        });
    }

    return (
        <Dialog
            open={open}
            onClose={saving ? undefined : onClose}
            fullWidth
            maxWidth="sm"
            dir="rtl"
        >
            <DialogTitle>
                הוספת טיפול חדש
            </DialogTitle>

            <DialogContent dividers>
                <Typography fontWeight="bold" mb={1}>
                    סוג טיפול
                </Typography>

                <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                    {treatmentTypes
                        .filter(type =>
                            Number(type.is_active ?? 1) === 1
                        )
                        .map(type => {
                            const selected =
                                String(newTreatment.treatment_type_id) ===
                                String(type.treatment_type_id);

                            return (
                                <Chip
                                    key={type.treatment_type_id}
                                    label={type.treatment_name}
                                    clickable
                                    onClick={() =>
                                        selectTreatmentType(type)
                                    }
                                    disabled={saving}
                                    sx={{
                                        bgcolor: selected
                                            ? "#B68FFF"
                                            : "transparent",
                                        color: selected
                                            ? "#fff"
                                            : "#8B5BC7",
                                        border: "1px solid #B68FFF"
                                    }}
                                />
                            );
                        })}
                </Box>

                {errors.type && (
                    <Typography color="error" variant="body2">
                        {errors.type}
                    </Typography>
                )}

                {newTreatment.treatment_type_id && (
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: "#F7F7F7",
                            borderRadius: 2,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 2,
                            mb: 3
                        }}
                    >
                        <Typography>
                            מחיר מחירון:
                            {" "}
                            <strong>
                                {money(toCents(
                                    newTreatment.default_price
                                ))} ₪
                            </strong>
                        </Typography>

                        <Typography>
                            משך מומלץ:
                            {" "}
                            <strong>
                                {newTreatment.default_duration || "—"} דקות
                            </strong>
                        </Typography>
                    </Box>
                )}

                <Box
                    display="flex"
                    gap={2}
                    flexDirection={{
                        xs: "column",
                        sm: "row"
                    }}
                    mb={3}
                >
                    <TextField
                        fullWidth
                        type="date"
                        label="תאריך"
                        value={newTreatment.date || ""}
                        onChange={e =>
                            updateField("date", e.target.value)
                        }
                        error={Boolean(errors.date)}
                        helperText={errors.date}
                        disabled={saving}
                        InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                        fullWidth
                        type="number"
                        label="משך טיפול (דקות)"
                        value={newTreatment.duration ?? ""}
                        onChange={e =>
                            updateField("duration", e.target.value)
                        }
                        error={Boolean(errors.duration)}
                        helperText={errors.duration}
                        disabled={saving}
                        inputProps={{ min: 1 }}
                    />
                </Box>

                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="סיכום טיפול"
                    value={newTreatment.summary || ""}
                    onChange={e =>
                        updateField("summary", e.target.value)
                    }
                    error={Boolean(errors.summary)}
                    helperText={errors.summary}
                    disabled={saving}
                    sx={{ mb: 3 }}
                />

                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                >
                    <Typography>
                        מחיר מיוחד לטיפול זה
                    </Typography>

                    <Switch
                        checked={Boolean(
                            newTreatment.is_special_price
                        )}
                        onChange={e =>
                            toggleSpecialPrice(e.target.checked)
                        }
                        disabled={
                            saving ||
                            !newTreatment.treatment_type_id
                        }
                    />
                </Box>

                {newTreatment.is_special_price && (
                    <Box
                        display="flex"
                        gap={2}
                        flexDirection={{
                            xs: "column",
                            sm: "row"
                        }}
                    >
                        <TextField
                            fullWidth
                            type="number"
                            label="מחיר מיוחד (₪)"
                            value={newTreatment.treatment_price ?? ""}
                            onChange={e =>
                                updateField(
                                    "treatment_price",
                                    e.target.value
                                )
                            }
                            error={Boolean(errors.treatment_price)}
                            helperText={errors.treatment_price}
                            inputProps={{
                                min: 0,
                                step: "0.01"
                            }}
                            disabled={saving}
                        />

                        <TextField
                            fullWidth
                            label="הערה למחיר"
                            value={newTreatment.price_note || ""}
                            onChange={e =>
                                updateField("price_note", e.target.value)
                            }
                            disabled={saving}
                        />
                    </Box>
                )}

                <Divider sx={{ my: 3 }} />

                <Typography fontWeight="bold" mb={2}>
                    תשלום
                </Typography>

                <TextField
                    fullWidth
                    type="number"
                    label="סכום ששולם ישירות (₪)"
                    value={directInput}
                    onChange={e =>
                        updateField("payment_amount", e.target.value)
                    }
                    error={!directValid}
                    inputProps={{
                        min: 0,
                        step: "0.01"
                    }}
                    helperText="כסף חדש שהתקבל מהלקוח"
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
                        onChange={e =>
                            toggleWallet(e.target.checked)
                        }
                        disabled={saving}
                    />
                </Box>

                {useWallet && (
                    <Box
                        sx={{
                            bgcolor: "#F7F7F7",
                            p: 2,
                            mt: 1,
                            borderRadius: 2
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
                                        {money(walletBalance)} ₪
                                    </strong>
                                </Typography>

                                <Typography sx={{ mt: 1, mb: 2 }}>
                                    ניתן לנצל:
                                    {" "}
                                    <strong>
                                        {money(maxWalletUsable)} ₪
                                    </strong>
                                </Typography>

                                <TextField
                                    fullWidth
                                    type="number"
                                    label="סכום מהארנק (₪)"
                                    value={walletInput}
                                    onChange={e =>
                                        updateField(
                                            "walletAmount",
                                            e.target.value
                                        )
                                    }
                                    error={
                                        !walletValid ||
                                        !walletWithinLimit
                                    }
                                    helperText={
                                        !walletWithinLimit
                                            ? "הסכום חורג מהיתרה הזמינה"
                                            : ""
                                    }
                                    inputProps={{
                                        min: 0,
                                        step: "0.01"
                                    }}
                                    disabled={saving}
                                />
                            </>
                        ) : (
                            <Alert severity="warning">
                                יתרת הארנק אינה זמינה
                            </Alert>
                        )}
                    </Box>
                )}

                {newTreatment.treatment_type_id && (
                    <Box
                        sx={{
                            bgcolor: "#F7F7F7",
                            p: 2,
                            mt: 3,
                            borderRadius: 2
                        }}
                    >
                        <Typography fontWeight="bold" mb={2}>
                            סיכום תשלום
                        </Typography>

                        <Box
                            display="flex"
                            justifyContent="space-between"
                            mb={1}
                        >
                            <Typography>מחיר טיפול</Typography>
                            <Typography>
                                {money(price)} ₪
                            </Typography>
                        </Box>

                        <Box
                            display="flex"
                            justifyContent="space-between"
                            mb={1}
                        >
                            <Typography>שולם</Typography>
                            <Typography>
                                {money(appliedPayment)} ₪
                            </Typography>
                        </Box>

                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Typography>חוב</Typography>

                            <Chip
                                label={
                                    debt > 0
                                        ? `חוב ${money(debt)} ₪`
                                        : "שולם"
                                }
                                color={
                                    debt > 0 ? "error" : "success"
                                }
                                variant="outlined"
                            />
                        </Box>

                        {excess > 0 && (
                            <Alert
                                severity="success"
                                sx={{ mt: 2 }}
                            >
                                עודף של {money(excess)} ₪
                                יועבר לארנק
                            </Alert>
                        )}

                        {useWallet &&
                            walletAfter !== null &&
                            walletWithinLimit && (
                                <Typography
                                    variant="body2"
                                    sx={{ mt: 2 }}
                                >
                                    יתרה צפויה בארנק:
                                    {" "}
                                    <strong>
                                        {money(walletAfter)} ₪
                                    </strong>
                                </Typography>
                            )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={onClose}
                    disabled={saving}
                >
                    ביטול
                </Button>

                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={!paymentValid || saving}
                    sx={{
                        bgcolor: "#B68FFF",
                        "&:hover": {
                            bgcolor: "#A256E8"
                        }
                    }}
                >
                    {saving ? "שומר..." : "שמירה"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
