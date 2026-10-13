
import React, {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";

import {
    Box,
    Typography,
    Paper,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    CircularProgress,
    Alert,
    Divider,
    IconButton
} from "@mui/material";

import WalletOutlinedIcon from "@mui/icons-material/WalletOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import RefreshIcon from "@mui/icons-material/Refresh";
import { toast } from "react-toastify";

import { serverRequests } from "../Api";

const PURPLE = "#B68FFF";
const PURPLE_DARK = "#A256E8";
const PURPLE_SOFT = "#F6F0FF";
const PURPLE_BORDER = "#D9C2FF";

const toCents = (value) =>
    Math.round(Number(value) * 100);

const formatMoney = (value) =>
    (value / 100).toFixed(2);

function validAmount(value) {
    if (value === "" || value == null) return false;

    const number = Number(value);

    return (
        Number.isFinite(number) &&
        number > 0 &&
        Math.abs(
            number * 100 - Math.round(number * 100)
        ) < 1e-7
    );
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return `${date.toLocaleDateString("he-IL")} • ${date.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit"
    })}`;
}

// Classify wallet movements from the existing
// payments table without altering the database.
function getMovement(payment) {
    const note = payment.note || "";

    const received = toCents(payment.amount_received || 0);
    const applied = toCents(payment.amount_applied || 0);

    if (note.startsWith("MANUAL_WALLET_CREDIT:")) {
        return {
            title: "הוספה ידנית",
            detail: note.replace(
                "MANUAL_WALLET_CREDIT:",
                ""
            ).trim(),
            amount: received - applied
        };
    }

    if (note.startsWith("MANUAL_WALLET_DEBIT:")) {
        return {
            title: "הפחתה ידנית",
            detail: note.replace(
                "MANUAL_WALLET_DEBIT:",
                ""
            ).trim(),
            amount: -applied
        };
    }

    if (payment.payment_source === "WALLET") {
        return {
            title: payment.target_type === "TREATMENT"
                ? "תשלום עבור טיפול"
                : "תשלום עבור רכישה",
            detail: note,
            amount: -applied
        };
    }

    if (payment.target_type === "WALLET_CREDIT") {
        return {
            title: "זיכוי לארנק",
            detail: note,
            amount: received - applied
        };
    }

    if (
        payment.payment_source === "DIRECT" &&
        received > applied
    ) {
        return {
            title: "עודף שהועבר לארנק",
            detail: note,
            amount: received - applied
        };
    }

    return {
        title: "פעולת ארנק",
        detail: note,
        amount: 0
    };
}

export default function ClientWallet({ clientId }) {
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [action, setAction] = useState("CREDIT");

    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");

    const [saving, setSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    // Prevent accidental duplicate financial requests.
    const savingRef = useRef(false);

    const loadWallet = useCallback(async () => {
        if (!clientId) return;

        setLoading(true);

        try {
            const response = await serverRequests(
                "GET",
                `wallet/${clientId}`
            );

            if (
                !response ||
                typeof response.json !== "function"
            ) {
                throw new Error("לא ניתן להתחבר לשרת");
            }

            const data = await response.json();

            if (!response.ok || data?.success !== true) {
                throw new Error(
                    data?.message || "שגיאה בטעינת הארנק"
                );
            }

            if (
                data.credit_balance == null ||
                !Number.isFinite(
                    Number(data.credit_balance)
                )
            ) {
                throw new Error("יתרת הארנק אינה תקינה");
            }

            setWallet(data);

        } catch (err) {
            toast.error(err.message || "שגיאה בטעינת הארנק");
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        loadWallet();
    }, [loadWallet]);

    const balance = wallet
        ? toCents(wallet.credit_balance)
        : 0;

    const amountValid = validAmount(amount);
    const amountCents = amountValid
        ? toCents(amount)
        : 0;

    const noteValid =
        note.trim().length > 0 &&
        note.trim().length <= 400;

    const withinBalance =
        action !== "DEBIT" ||
        amountCents <= balance;

    const newBalance = action === "CREDIT"
        ? balance + amountCents
        : balance - amountCents;

    const canSubmit =
        amountValid &&
        noteValid &&
        withinBalance &&
        !saving;

    function openAdjustment(type) {
        setAction(type);
        setAmount("");
        setNote("");
        setConfirmOpen(false);
        setDialogOpen(true);
    }

    function closeAdjustment() {
        if (saving) return;

        setConfirmOpen(false);
        setDialogOpen(false);
    }

    function requestConfirmation() {
        if (!canSubmit) return;

        setConfirmOpen(true);
    }

    async function saveAdjustment() {
        if (!canSubmit || savingRef.current) {
            return;
        }

        savingRef.current = true;
        setSaving(true);
        setConfirmOpen(false);

        try {
            const response = await serverRequests(
                "POST",
                `wallet/${clientId}/adjust`,
                {
                    action,
                    amount: formatMoney(amountCents),
                    note: note.trim()
                }
            );

            if (
                !response ||
                typeof response.json !== "function"
            ) {
                throw new Error(
                    "לא התקבלה תשובה מהשרת. יש לבדוק את היתרה לפני ניסיון חוזר."
                );
            }

            const data = await response.json();

            if (!response.ok || data?.success !== true) {
                throw new Error(
                    data?.message ||
                    "שמירת הפעולה נכשלה"
                );
            }

            setDialogOpen(false);
            toast.success(data.message || "יתרת הארנק עודכנה בהצלחה");

            await loadWallet();

        } catch (err) {
            console.error("Wallet adjustment error:", err);

            toast.error(
                err.message || "לא ניתן להשלים את הפעולה"
            );

            // In an uncertain network failure, do not
            // automatically retry a financial operation.
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }


    return (
        <Box
            dir="rtl"
            sx={{
                p: { xs: 1, sm: 3 },
                maxWidth: 950,
                mx: "auto",
                direction: "rtl"
            }}
        >
            {/* Wallet balance card */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 3, sm: 4 },
                    borderRadius: 3,
                    border: `1px solid ${PURPLE_BORDER}`,
                    background:
                        "linear-gradient(135deg, #FFFFFF 0%, #F6F0FF 100%)"
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 2,
                        direction: "rtl"
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            textAlign: "right",
                            direction: "rtl",
                            gap: 0.75,
                            width: "fit-content"
                        }}
                    >
                        <Typography
                            color="text.secondary"
                            fontWeight={500}
                            sx={{ textAlign: "right" }}
                        >
                            יתרה זמינה בארנק
                        </Typography>

                        {loading ? (
                            <CircularProgress
                                size={30}
                                sx={{
                                    color: PURPLE_DARK,
                                    mt: 2
                                }}
                            />
                        ) : (
                            <Typography
                                component="div"
                                sx={{
                                    fontSize: {
                                        xs: 34,
                                        sm: 44
                                    },
                                    fontWeight: 700,
                                    color: PURPLE_DARK,
                                    mt: 1,
                                    textAlign: "right"
                                }}
                            >
                                <Box
                                    component="span"
                                    dir="ltr"
                                    sx={{
                                        display: "inline-block",
                                        unicodeBidi: "isolate",
                                        fontVariantNumeric: "tabular-nums"
                                    }}
                                >
                                    {wallet
                                        ? `${formatMoney(balance)} ₪`
                                        : "—"}
                                </Box>
                            </Typography>
                        )}
                    </Box>

                    <Box
                        sx={{
                            bgcolor: "#fff",
                            borderRadius: 3,
                            p: 2,
                            color: PURPLE_DARK
                        }}
                    >
                        <WalletOutlinedIcon
                            sx={{ fontSize: 48 }}
                        />
                    </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                        justifyContent: "flex-start",
                        direction: "rtl"
                    }}
                >
                    <Button
                        variant="contained"
                        startIcon={<AddCircleOutlineIcon />}
                        disabled={!wallet || loading || saving}
                        onClick={() => openAdjustment("CREDIT")}
                        sx={{
                            bgcolor: PURPLE,
                            borderRadius: 2,
                            px: 3,
                            "&:hover": {
                                bgcolor: PURPLE_DARK
                            }
                        }}
                    >
                         הוספת כסף
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<RemoveCircleOutlineIcon />}
                        disabled={
                            !wallet ||
                            loading ||
                            saving ||
                            balance <= 0
                        }
                        onClick={() => openAdjustment("DEBIT")}
                        sx={{
                            color: PURPLE_DARK,
                            borderColor: PURPLE_BORDER,
                            borderRadius: 2,
                            px: 3,
                            "&:hover": {
                                borderColor: PURPLE_DARK,
                                bgcolor: PURPLE_SOFT
                            }
                        }}
                    >
                        הפחתת כסף
                    </Button>
                </Box>
            </Paper>

            {/* Wallet history */}
            <Paper
                elevation={0}
                sx={{
                    mt: 3,
                    p: { xs: 2, sm: 3 },
                    borderRadius: 3,
                    border: "1px solid #EEEEF2",
                    direction: "rtl"
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2,
                        direction: "rtl"
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1
                        }}
                    >
                        <HistoryIcon
                            sx={{ color: PURPLE_DARK }}
                        />

                        <Typography fontWeight={700}>
                            היסטוריית פעולות בארנק
                        </Typography>
                    </Box>

                    <IconButton
                        onClick={loadWallet}
                        disabled={loading || saving}
                        sx={{ color: PURPLE_DARK }}
                    >
                        <RefreshIcon />
                    </IconButton>
                </Box>

                {!loading &&
                    (!wallet?.payments ||
                        wallet.payments.length === 0) && (
                        <Typography
                            color="text.secondary"
                            textAlign="center"
                            sx={{ py: 4 }}
                        >
                            עדיין אין פעולות בארנק
                        </Typography>
                    )}

                {wallet?.payments?.map((payment) => {
                    const movement = getMovement(payment);
                    const positive = movement.amount > 0;

                    return (
                        <Box
                            key={payment.payment_id}
                            sx={{
                                py: 2.25,
                                borderBottom: "1px solid #F0F0F0"
                            }}
                        >
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "minmax(0, 1fr) auto",
                                    alignItems: "center",
                                    columnGap: { xs: 1.5, sm: 3 },
                                    width: "100%",
                                    direction: "rtl"
                                }}
                            >
                                {/* Right side: title, date, note */}
                                <Box
                                    sx={{
                                        gridColumn: 1,
                                        minWidth: 0,
                                        direction: "rtl",
                                        textAlign: "right",
                                        justifySelf: "stretch"
                                    }}
                                >
                                    <Typography
                                        fontWeight={700}
                                        sx={{
                                            fontSize: 15,
                                            textAlign: "right",
                                            direction: "rtl"
                                        }}
                                    >
                                        {movement.title}
                                    </Typography>

                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            mt: 0.25,
                                            textAlign: "right",
                                            direction: "rtl",
                                            fontVariantNumeric: "tabular-nums"
                                        }}
                                    >
                                        <Box
                                            component="span"
                                            dir="ltr"
                                            sx={{
                                                display: "inline-block",
                                                unicodeBidi: "isolate"
                                            }}
                                        >
                                            {formatDate(payment.payment_date)}
                                        </Box>
                                    </Typography>

                                    {movement.detail && (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                display: "block",
                                                mt: 0.5,
                                                width: "100%",
                                                textAlign: "right",
                                                direction: "rtl",
                                                overflowWrap: "anywhere",
                                                lineHeight: 1.7
                                            }}
                                        >
                                            <Box
                                                component="span"
                                                dir={
                                                    /[\u0590-\u05FF]/.test(
                                                        movement.detail
                                                    )
                                                        ? "rtl"
                                                        : "ltr"
                                                }
                                                sx={{
                                                    display: "inline-block",
                                                    maxWidth: "100%",
                                                    unicodeBidi: "isolate",
                                                    textAlign: "right"
                                                }}
                                            >
                                                {movement.detail}
                                            </Box>
                                        </Typography>
                                    )}
                                </Box>

                                {/* Left side: amount */}
                                <Typography
                                    component="span"
                                    dir="ltr"
                                    fontWeight={700}
                                    sx={{
                                        gridColumn: 2,
                                        justifySelf: "end",
                                        color: positive
                                            ? "#2E7D32"
                                            : "#555",
                                        whiteSpace: "nowrap",
                                        direction: "ltr",
                                        unicodeBidi: "isolate",
                                        fontVariantNumeric: "tabular-nums",
                                        fontSize: 15,
                                        textAlign: "left"
                                    }}
                                >
                                    {positive ? "+" : "−"}
                                    {formatMoney(
                                        Math.abs(movement.amount)
                                    )} ₪
                                </Typography>
                            </Box>
                        </Box>
                    );
                })}
            </Paper>

            {/* Adjustment form */}
            <Dialog
                open={dialogOpen}
                onClose={closeAdjustment}
                fullWidth
                maxWidth="xs"
                dir="rtl"
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        direction: "rtl"
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontWeight: 700
                    }}
                >
                    {action === "CREDIT"
                        ? "הוספת כסף לארנק"
                        : "הפחתת כסף מהארנק"}

                    <IconButton
                        onClick={closeAdjustment}
                        disabled={saving}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    <Box
                        sx={{
                            bgcolor: PURPLE_SOFT,
                            borderRadius: 2,
                            p: 2,
                            mb: 3
                        }}
                    >
                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            יתרה נוכחית
                        </Typography>

                        <Typography
                            variant="h5"
                            fontWeight={700}
                            color={PURPLE_DARK}
                        >
                            <Box
                                component="span"
                                dir="ltr"
                                sx={{
                                    display: "inline-block",
                                    unicodeBidi: "isolate"
                                }}
                            >
                                {formatMoney(balance)} ₪
                            </Box>
                        </Typography>
                    </Box>

                    <TextField
                        fullWidth
                        type="number"
                        label="סכום (₪)"
                        value={amount}
                        onChange={(e) =>
                            setAmount(e.target.value)
                        }
                        inputProps={{
                            min: 0.01,
                            step: 0.01
                        }}
                        sx={{ mb: 2 }}
                        disabled={saving}
                    />

                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        label="סיבה / הערה"
                        placeholder={
                            action === "CREDIT"
                                ? "לדוגמה: הפקדה ידנית"
                                : "לדוגמה: תיקון סכום שהוזן בטעות"
                        }
                        value={note}
                        onChange={(e) =>
                            setNote(e.target.value)
                        }
                        disabled={saving}
                        helperText={`${note.length}/400 תווים`}
                        error={note.length > 400}
                    />

                    {amountValid && withinBalance && (
                        <Box
                            sx={{
                                mt: 3,
                                bgcolor: "#F8F8FA",
                                borderRadius: 2,
                                p: 2
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    direction: "rtl",
                                    mb: 1
                                }}
                            >
                                <Typography>
                                    יתרה לפני
                                </Typography>

                                <Typography>
                                    <Box
                                        component="span"
                                        dir="ltr"
                                        sx={{
                                            display: "inline-block",
                                            unicodeBidi: "isolate"
                                        }}
                                    >
                                        {formatMoney(balance)} ₪
                                    </Box>
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    direction: "rtl"
                                }}
                            >
                                <Typography fontWeight={700}>
                                    יתרה לאחר הפעולה
                                </Typography>

                                <Typography
                                    fontWeight={700}
                                    color={PURPLE_DARK}
                                >
                                    <Box
                                        component="span"
                                        dir="ltr"
                                        sx={{
                                            display: "inline-block",
                                            unicodeBidi: "isolate"
                                        }}
                                    >
                                        {formatMoney(newBalance)} ₪
                                    </Box>
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {!withinBalance && (
                        <Alert
                            severity="error"
                            sx={{ mt: 2 }}
                        >
                            לא ניתן להפחית סכום הגבוה
                            מהיתרה הזמינה בארנק.
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions
                    sx={{
                        p: 2,
                        direction: "rtl"
                    }}
                >
                    <Button
                        onClick={closeAdjustment}
                        disabled={saving}
                        sx={{ color: "#666" }}
                    >
                        ביטול
                    </Button>

                    <Button
                        variant="contained"
                        disabled={!canSubmit}
                        onClick={requestConfirmation}
                        sx={{
                            bgcolor: PURPLE,
                            "&:hover": {
                                bgcolor: PURPLE_DARK
                            }
                        }}
                    >
                        המשך לאישור
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation before financial changes */}
            <Dialog
                open={confirmOpen}
                onClose={() => {
                    if (!saving) {
                        setConfirmOpen(false);
                    }
                }}
                fullWidth
                maxWidth="xs"
                dir="rtl"
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        direction: "rtl"
                    }
                }}
            >
                <DialogTitle>
                    אישור שינוי יתרת הארנק
                </DialogTitle>

                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        האם לבצע{" "}
                        {action === "CREDIT"
                            ? "הוספה"
                            : "הפחתה"}{" "}
                        של{" "}
                        <strong>
                            <Box
                                component="span"
                                dir="ltr"
                                sx={{
                                    display: "inline-block",
                                    unicodeBidi: "isolate"
                                }}
                            >
                                {formatMoney(amountCents)} ₪
                            </Box>
                        </strong>
                        ?
                    </Typography>

                    <Box
                        sx={{
                            p: 2,
                            bgcolor: PURPLE_SOFT,
                            borderRadius: 2
                        }}
                    >
                        <Typography>
                            יתרה לפני:{" "}
                            <Box
                                component="span"
                                dir="ltr"
                                sx={{
                                    display: "inline-block",
                                    unicodeBidi: "isolate"
                                }}
                            >
                                {formatMoney(balance)} ₪
                            </Box>
                        </Typography>

                        <Typography fontWeight={700} mt={1}>
                            יתרה אחרי:{" "}
                            <Box
                                component="span"
                                dir="ltr"
                                sx={{
                                    display: "inline-block",
                                    unicodeBidi: "isolate"
                                }}
                            >
                                {formatMoney(newBalance)} ₪
                            </Box>
                        </Typography>
                    </Box>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        mt={2}
                        sx={{
                            overflowWrap: "anywhere",
                            textAlign: "right"
                        }}
                    >
                        סיבה: {note}
                    </Typography>
                </DialogContent>

                <DialogActions
                    sx={{
                        p: 2,
                        direction: "rtl"
                    }}
                >
                    <Button
                        onClick={() =>
                            setConfirmOpen(false)
                        }
                        disabled={saving}
                        sx={{ color: "#666" }}
                    >
                        חזרה
                    </Button>

                    <Button
                        variant="contained"
                        disabled={saving}
                        onClick={saveAdjustment}
                        sx={{
                            bgcolor: PURPLE,
                            "&:hover": {
                                bgcolor: PURPLE_DARK
                            }
                        }}
                    >
                        {saving ? (
                            <CircularProgress
                                size={20}
                                color="inherit"
                            />
                        ) : (
                            "אישור ושמירה"
                        )}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );

}
