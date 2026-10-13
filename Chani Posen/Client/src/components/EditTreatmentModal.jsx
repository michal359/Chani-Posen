
import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    TextField,
    Button,
    Chip,
    Switch,
    FormControlLabel,
    Alert,
    Divider
} from "@mui/material";

// -----------------------------------------
// Money helpers
// -----------------------------------------
const toCents = (value) =>
    Math.round(Number(value || 0) * 100);

const formatMoney = (value) =>
    (value / 100).toFixed(2);

function validPrice(value) {
    if (value === "" || value == null) {
        return false;
    }

    const number = Number(value);

    return (
        Number.isFinite(number) &&
        number >= 0 &&
        Math.abs(
            number * 100 - Math.round(number * 100)
        ) < 1e-7
    );
}

function dateForInput(value) {
    if (!value) return "";

    if (typeof value === "string") {
        return value.substring(0, 10);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// -----------------------------------------
// Edit treatment modal
// -----------------------------------------
export default function EditTreatmentModal({
    open,
    onClose,
    onSave,
    editTreatment,
    setEditTreatment,
    treatmentTypes = [],
    errors = {},
    saving = false
}) {
    const [confirmRefundOpen, setConfirmRefundOpen] =
        useState(false);

    function updateField(field, value) {
        setEditTreatment((previous) => ({
            ...previous,
            [field]: value
        }));
    }

    // -----------------------------------------
    // Change treatment type
    // -----------------------------------------
    function handleTypeChange(type) {
        setEditTreatment((previous) => ({
            ...previous,

            treatment_type_id:
                type.treatment_type_id,

            treatment_name:
                type.treatment_name,

            // Suggest the new treatment's list price.
            treatment_price:
                type.default_price,

            // Preserve existing duration and summary.
            duration:
                previous.duration,

            summary:
                previous.summary,

            is_special_price: false,
            price_note: ""
        }));
    }

    // -----------------------------------------
    // Special price
    // -----------------------------------------

    function toggleSpecialPrice(checked) {
        setEditTreatment((previous) => {
            const type = treatmentTypes.find(
                (item) =>
                    String(item.treatment_type_id) ===
                    String(previous.treatment_type_id)
            );

            return {
                ...previous,
                is_special_price: checked,

                treatment_price: checked
                    ? previous.treatment_price
                    : type?.default_price ??
                    previous.treatment_price,

                price_note: checked
                    ? previous.price_note
                    : ""
            };
        });
    }

    // -----------------------------------------
    // Financial calculations
    // -----------------------------------------
    const priceValid = validPrice(
        editTreatment?.treatment_price
    );

    const price = priceValid
        ? toCents(editTreatment.treatment_price)
        : 0;

    const alreadyPaid = toCents(
        editTreatment?.amount_paid
    );

    const debt = Math.max(
        0,
        price - alreadyPaid
    );

    const creditToWallet = priceValid
        ? Math.max(0, alreadyPaid - price)
        : 0;

    const selectedType = treatmentTypes.find(
        (type) =>
            String(type.treatment_type_id) ===
            String(editTreatment?.treatment_type_id)
    );

    const durationValid =
        Number.isInteger(
            Number(editTreatment?.duration)
        ) &&
        Number(editTreatment?.duration) > 0;

    const summaryValid = Boolean(
        editTreatment?.summary?.trim()
    );

    const dateValid = Boolean(
        editTreatment?.treatment_date
    );

    const canSave =
        Boolean(editTreatment?.treatment_type_id) &&
        priceValid &&
        durationValid &&
        summaryValid &&
        dateValid &&
        !saving;

    // -----------------------------------------
    // Save or request refund confirmation
    // -----------------------------------------
    function handleSaveClick() {
        if (!canSave) return;

        if (creditToWallet > 0) {
            setConfirmRefundOpen(true);
            return;
        }

        onSave?.();
    }

    function confirmRefundAndSave() {
        if (!canSave) return;

        setConfirmRefundOpen(false);
        onSave?.();
    }

    function handleClose() {
        if (saving) return;

        setConfirmRefundOpen(false);
        onClose?.();
    }

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                dir="rtl"
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    עריכת פרטי טיפול
                </DialogTitle>

                <DialogContent dividers>
                    {/* Treatment type */}
                    <Typography
                        fontWeight="bold"
                        sx={{ mb: 1 }}
                    >
                        סוג טיפול
                    </Typography>

                    <Box
                        display="flex"
                        flexWrap="wrap"
                        gap={1}
                        mb={3}
                    >
                        {treatmentTypes
                            .filter(
                                (type) =>
                                    Boolean(
                                        Number(
                                            type.is_active ?? 1
                                        )
                                    ) ||
                                    String(
                                        type.treatment_type_id
                                    ) === String(
                                        editTreatment?.treatment_type_id
                                    )
                            )
                            .map((type) => {
                                const selected =
                                    String(
                                        type.treatment_type_id
                                    ) === String(
                                        editTreatment?.treatment_type_id
                                    );

                                return (
                                    <Chip
                                        key={
                                            type.treatment_type_id
                                        }
                                        label={
                                            type.treatment_name
                                        }
                                        clickable
                                        disabled={saving}
                                        onClick={() =>
                                            handleTypeChange(type)
                                        }
                                        sx={{
                                            bgcolor: selected
                                                ? "#B68FFF"
                                                : "transparent",

                                            color: selected
                                                ? "white"
                                                : "#8B5BC7",

                                            border:
                                                "1px solid #B68FFF"
                                        }}
                                    />
                                );
                            })}
                    </Box>

                    {/* Date and duration */}
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
                            label="תאריך הטיפול"
                            value={dateForInput(
                                editTreatment?.treatment_date
                            )}
                            onChange={(event) =>
                                updateField(
                                    "treatment_date",
                                    event.target.value
                                )
                            }
                            error={Boolean(errors.date)}
                            helperText={errors.date}
                            disabled={saving}
                            InputLabelProps={{
                                shrink: true
                            }}
                        />

                        <TextField
                            fullWidth
                            type="number"
                            label="משך הטיפול (בדקות)"
                            value={
                                editTreatment?.duration ?? ""
                            }
                            onChange={(event) =>
                                updateField(
                                    "duration",
                                    event.target.value
                                )
                            }
                            inputProps={{
                                min: 1,
                                step: 1
                            }}
                            error={
                                !durationValid ||
                                Boolean(errors.duration)
                            }
                            helperText={errors.duration}
                            disabled={saving}
                        />
                    </Box>

                    {/* Summary */}
                    <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={10}
                        label="סיכום הטיפול"
                        value={
                            editTreatment?.summary || ""
                        }
                        onChange={(event) =>
                            updateField(
                                "summary",
                                event.target.value
                            )
                        }
                        error={Boolean(errors.summary)}
                        helperText={errors.summary}
                        disabled={saving}
                        sx={{ mb: 3 }}
                    />

                    <Divider sx={{ mb: 3 }} />

                    {/* Price */}
                    <Typography
                        fontWeight="bold"
                        sx={{ mb: 2 }}
                    >
                        מחיר הטיפול
                    </Typography>

                    {selectedType && (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                        >
                            מחיר מחירון:
                            {" "}
                            {Number(
                                selectedType.default_price
                            ).toFixed(2)}
                            {" "}₪
                        </Typography>
                    )}

                    <FormControlLabel
                        sx={{ mb: 2 }}
                        label="מחיר מיוחד לטיפול זה"
                        control={
                            <Switch
                                checked={Boolean(
                                    editTreatment?.is_special_price
                                )}
                                disabled={saving}
                                onChange={(event) =>
                                    toggleSpecialPrice(
                                        event.target.checked
                                    )
                                }
                            />
                        }
                    />

                    <TextField
                        fullWidth
                        type="number"
                        label="מחיר הטיפול בפועל (₪)"
                        value={
                            editTreatment?.treatment_price ?? ""
                        }
                        onChange={(event) =>
                            updateField(
                                "treatment_price",
                                event.target.value
                            )
                        }
                        inputProps={{
                            min: 0,
                            step: "0.01"
                        }}
                        error={
                            !priceValid ||
                            Boolean(errors.treatment_price)
                        }
                        helperText={
                            errors.treatment_price ||
                            "שינוי המחיר לא מוחק תשלומים קודמים"
                        }
                        disabled={saving}
                    />

                    {editTreatment?.is_special_price && (
                        <TextField
                            fullWidth
                            label="הערה למחיר המיוחד"
                            value={
                                editTreatment?.price_note || ""
                            }
                            onChange={(event) =>
                                updateField(
                                    "price_note",
                                    event.target.value
                                )
                            }
                            disabled={saving}
                            sx={{ mt: 2 }}
                        />
                    )}

                    <Divider sx={{ my: 3 }} />

                    {/* Financial summary */}
                    <Typography
                        fontWeight="bold"
                        sx={{ mb: 2 }}
                    >
                        מצב כספי
                    </Typography>

                    <Box
                        sx={{
                            bgcolor: "#F7F7F7",
                            borderRadius: 2,
                            p: 2
                        }}
                    >
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            mb={2}
                        >
                            <Typography>
                                מחיר מעודכן
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

                            <Typography fontWeight="bold">
                                {formatMoney(alreadyPaid)} ₪
                            </Typography>
                        </Box>

                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Typography>
                                מצב החוב
                            </Typography>

                            <Chip
                                label={
                                    debt > 0
                                        ? `חוב ${formatMoney(debt)} ₪`
                                        : "שולם"
                                }
                                color={
                                    debt > 0
                                        ? "error"
                                        : "success"
                                }
                                variant="outlined"
                            />
                        </Box>
                    </Box>

                    {/* Refund preview */}
                    {creditToWallet > 0 && (
                        <Alert
                            severity="warning"
                            sx={{ mt: 2 }}
                        >
                            המחיר החדש נמוך מהסכום שכבר שולם.

                            <Typography
                                fontWeight="bold"
                                sx={{ mt: 1 }}
                            >
                                זיכוי צפוי לארנק:
                                {" "}
                                {formatMoney(creditToWallet)}
                                {" "}₪
                            </Typography>

                            הזיכוי יבוצע בעת שמירת
                            השינויים בשרת.
                        </Alert>
                    )}

                    <Alert
                        severity="info"
                        sx={{ mt: 2 }}
                    >
                        הוספת תשלום חדש לטיפול תתבצע
                        בחלון תשלומים נפרד.
                        לא ניתן לשנות תשלומים ישנים
                        ישירות בעריכת הטיפול.
                    </Alert>
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
                        onClick={handleSaveClick}
                        disabled={!canSave}
                        sx={{
                            bgcolor: "#B68FFF",
                            "&:hover": {
                                bgcolor: "#A256E8"
                            }
                        }}
                    >
                        {saving
                            ? "שומר..."
                            : "שמירת שינויים"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Refund confirmation dialog */}
            <Dialog
                open={confirmRefundOpen && open}
                onClose={() => {
                    if (!saving) {
                        setConfirmRefundOpen(false);
                    }
                }}
                dir="rtl"
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>
                    אישור זיכוי לארנק
                </DialogTitle>

                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        המחיר החדש של הטיפול נמוך
                        מהסכום שכבר שולם.
                    </Typography>

                    <Box
                        sx={{
                            bgcolor: "#F7F7F7",
                            borderRadius: 2,
                            p: 2
                        }}
                    >
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            mb={2}
                        >
                            <Typography>
                                כבר שולם
                            </Typography>

                            <strong>
                                {formatMoney(alreadyPaid)} ₪
                            </strong>
                        </Box>

                        <Box
                            display="flex"
                            justifyContent="space-between"
                            mb={2}
                        >
                            <Typography>
                                מחיר חדש
                            </Typography>

                            <strong>
                                {formatMoney(price)} ₪
                            </strong>
                        </Box>

                        <Divider sx={{ mb: 2 }} />

                        <Box
                            display="flex"
                            justifyContent="space-between"
                        >
                            <Typography fontWeight="bold">
                                זיכוי לארנק
                            </Typography>

                            <Typography
                                fontWeight="bold"
                                color="success.main"
                            >
                                {formatMoney(creditToWallet)} ₪
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        disabled={saving}
                        onClick={() =>
                            setConfirmRefundOpen(false)
                        }
                    >
                        חזרה לעריכה
                    </Button>

                    <Button
                        variant="contained"
                        color="success"
                        disabled={!canSave}
                        onClick={confirmRefundAndSave}
                    >
                        אישור ושמירה
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
