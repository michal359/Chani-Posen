import React, { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Divider,
    Stack,
    Tooltip
} from "@mui/material";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import PaymentsIcon from "@mui/icons-material/Payments";

function money(value) {
    const amount = Number(value ?? 0);

    return Number.isFinite(amount)
        ? `${amount.toFixed(2)} ₪`
        : "—";
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("he-IL");
}

function getFinancials(treatment) {
    const price = Math.round(
        Number(treatment.treatment_price || 0) * 100
    );

    const paid = Math.round(
        Number(treatment.amount_paid || 0) * 100
    );

    return {
        price,
        paid,
        debt: Math.max(0, price - paid)
    };
}

function DebtChip({ treatment }) {
    const { debt } = getFinancials(treatment);

    return debt > 0 ? (
        <Chip
            label={`חוב ${money(debt / 100)}`}
            color="error"
            variant="outlined"
            size="small"
            sx={{ fontWeight: "bold" }}
        />
    ) : (
        <Chip
            label="שולם"
            color="success"
            variant="outlined"
            size="small"
        />
    );
}

function DetailField({ label, children }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Typography
                variant="caption"
                color="text.secondary"
            >
                {label}
            </Typography>

            <Typography
                sx={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere"
                }}
            >
                {children || "—"}
            </Typography>
        </Box>
    );
}

export default function TreatmentsTable({
    treatments = [],
    onEdit,
    onDelete,
    onAddPayment
}) {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedTreatment, setSelectedTreatment] =
        useState(null);

    const [detailsOpen, setDetailsOpen] = useState(false);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const sortedTreatments = [...treatments].sort(
        (a, b) => {
            const dateDifference =
                new Date(b.treatment_date) -
                new Date(a.treatment_date);

            if (dateDifference !== 0) {
                return dateDifference;
            }

            return Number(b.treatment_id) -
                Number(a.treatment_id);
        }
    );

    const safePage = Math.min(
        page,
        Math.max(
            0,
            Math.ceil(sortedTreatments.length / rowsPerPage) - 1
        )
    );

    const visibleTreatments = sortedTreatments.slice(
        safePage * rowsPerPage,
        (safePage + 1) * rowsPerPage
    );

    function handleAddPayment(treatment) {
        closeMenu();
        setDetailsOpen(false);

        if (treatment) {
            onAddPayment?.(treatment);
        }
    }

    // This is a UI-level preliminary check.
    // The server must also inspect payment history.
    function canDelete(treatment) {
        if (!treatment) return false;

        if (treatment.can_delete !== undefined) {
            return treatment.can_delete === true ||
                treatment.can_delete === 1;
        }

        return Number(treatment.amount_paid) === 0;
    }

    function openMenu(event, treatment) {
        event.stopPropagation();

        setSelectedTreatment(treatment);
        setAnchorEl(event.currentTarget);
    }

    function closeMenu() {
        setAnchorEl(null);
    }

    function openDetails(treatment) {
        closeMenu();
        setSelectedTreatment(treatment);
        setDetailsOpen(true);
    }

    function editTreatment(treatment) {
        closeMenu();
        setDetailsOpen(false);

        if (treatment) {
            onEdit?.(treatment);
        }
    }

    function deleteTreatment(treatment) {
        closeMenu();

        if (!treatment || !canDelete(treatment)) {
            return;
        }

        setDetailsOpen(false);
        onDelete?.(treatment);
    }

    return (
        <Box dir="rtl">
            <TableContainer
                component={Paper}
                sx={{
                    mt: 3,
                    overflowX: "auto"
                }}
            >
                <Table
                    sx={{ minWidth: 850 }}
                    aria-label="טבלת טיפולים"
                >
                    <TableHead>
                        <TableRow>
                            <TableCell>סוג טיפול</TableCell>
                            <TableCell>תאריך</TableCell>
                            <TableCell align="center">
                                משך
                            </TableCell>
                            <TableCell>סיכום טיפול</TableCell>
                            <TableCell align="center">
                                מחיר
                            </TableCell>
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
                        {visibleTreatments.map((treatment) => (
                            <TableRow
                                key={treatment.treatment_id}
                                hover
                                onDoubleClick={() =>
                                    openDetails(treatment)
                                }
                                sx={{
                                    cursor: "pointer",
                                    "& td": {
                                        borderBottom:
                                            "1px solid #eee"
                                    }
                                }}
                            >
                                <TableCell>
                                    {treatment.treatment_type ||
                                        treatment.treatment_name ||
                                        "—"}
                                </TableCell>

                                <TableCell>
                                    {formatDate(
                                        treatment.treatment_date
                                    )}
                                </TableCell>

                                <TableCell align="center">
                                    {treatment.duration} דקות
                                </TableCell>

                                <TableCell
                                    sx={{
                                        maxWidth: 230,
                                        width: 230
                                    }}
                                >
                                    {treatment.summary ? (
                                        <Tooltip
                                            title="לחיצה כפולה לצפייה בסיכום המלא"
                                            arrow
                                        >
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                sx={{
                                                    maxWidth: 215
                                                }}
                                            >
                                                {treatment.summary}
                                            </Typography>
                                        </Tooltip>
                                    ) : (
                                        <Chip
                                            label="חסר סיכום טיפול"
                                            color="error"
                                            variant="outlined"
                                            size="small"
                                        />
                                    )}
                                </TableCell>

                                <TableCell align="center">
                                    <Stack
                                        spacing={0.5}
                                        alignItems="center"
                                    >
                                        <Typography>
                                            {money(
                                                treatment.treatment_price
                                            )}
                                        </Typography>

                                        {Boolean(
                                            treatment.is_special_price
                                        ) && (
                                                <Chip
                                                    label="מחיר מיוחד"
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                        color: "#8E55D6",
                                                        borderColor: "#B68FFF"
                                                    }}
                                                />
                                            )}
                                    </Stack>
                                </TableCell>

                                <TableCell align="center">
                                    {money(treatment.amount_paid)}
                                </TableCell>

                                <TableCell align="center">
                                    <DebtChip
                                        treatment={treatment}
                                    />
                                </TableCell>

                                <TableCell align="center">
                                    <IconButton
                                        aria-label="פעולות טיפול"
                                        onClick={(event) =>
                                            openMenu(
                                                event,
                                                treatment
                                            )
                                        }
                                    >
                                        <MoreVertIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}

                        {sortedTreatments.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    align="center"
                                    sx={{ py: 5 }}
                                >
                                    אין עדיין טיפולים
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={sortedTreatments.length}
                page={safePage}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
                onPageChange={(_, nextPage) =>
                    setPage(nextPage)
                }
                onRowsPerPageChange={(event) => {
                    setRowsPerPage(
                        Number(event.target.value)
                    );
                    setPage(0);
                }}
                labelRowsPerPage="טיפולים בעמוד:"
            />

            {/* Three-dot actions */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={closeMenu}
            >
                <MenuItem
                    onClick={() =>
                        openDetails(selectedTreatment)
                    }
                >
                    פרטי הטיפול
                </MenuItem>

                {selectedTreatment &&
                    Number(selectedTreatment.amount_paid || 0) <
                    Number(selectedTreatment.treatment_price || 0) && (
                        <MenuItem
                            onClick={() =>
                                handleAddPayment(selectedTreatment)
                            }
                        >
                            <PaymentsIcon sx={{ ml: 1 }} />
                            הוספת תשלום
                        </MenuItem>
                    )}

                <MenuItem
                    onClick={() =>
                        editTreatment(selectedTreatment)
                    }
                >
                    <EditIcon sx={{ ml: 1 }} />
                    עריכת טיפול
                </MenuItem>

                {canDelete(selectedTreatment) && (
                    <MenuItem
                        sx={{ color: "error.main" }}
                        onClick={() =>
                            deleteTreatment(
                                selectedTreatment
                            )
                        }
                    >
                        <DeleteIcon sx={{ ml: 1 }} />
                        מחיקת טיפול
                    </MenuItem>
                )}
            </Menu>

            {/* Full treatment details */}
            <Dialog
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                fullWidth
                maxWidth="sm"
                dir="rtl"
            >
                <DialogTitle
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >
                    פרטי הטיפול

                    <IconButton
                        onClick={() =>
                            setDetailsOpen(false)
                        }
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {selectedTreatment && (
                        <>
                            <DetailField label="סוג הטיפול">
                                {selectedTreatment.treatment_type ||
                                    selectedTreatment.treatment_name}
                            </DetailField>

                            <DetailField label="תאריך">
                                {formatDate(
                                    selectedTreatment.treatment_date
                                )}
                            </DetailField>

                            <DetailField label="משך הטיפול">
                                {selectedTreatment.duration} דקות
                            </DetailField>

                            <Divider sx={{ my: 2 }} />

                            <DetailField label="סיכום הטיפול">
                                {selectedTreatment.summary ||
                                    "לא הוזן סיכום טיפול"}
                            </DetailField>

                            <Divider sx={{ my: 2 }} />

                            <DetailField label="מחיר הטיפול">
                                {money(
                                    selectedTreatment.treatment_price
                                )}
                            </DetailField>

                            {Boolean(
                                selectedTreatment.is_special_price
                            ) && (
                                    <DetailField label="הערה למחיר מיוחד">
                                        {selectedTreatment.price_note ||
                                            "מחיר מיוחד"}
                                    </DetailField>
                                )}

                            <DetailField label="כבר שולם">
                                {money(selectedTreatment.amount_paid)}
                            </DetailField>

                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2
                                }}
                            >
                                <Typography>
                                    מצב התשלום:
                                </Typography>

                                <DebtChip
                                    treatment={selectedTreatment}
                                />
                            </Box>
                        </>
                    )}
                </DialogContent>

                <DialogActions
                    sx={{
                        p: 2,
                        justifyContent: "flex-start",
                        gap: 1
                    }}
                >
                    <Button
                        onClick={() =>
                            setDetailsOpen(false)
                        }
                    >
                        סגירה
                    </Button>

                    {selectedTreatment &&
                        Number(selectedTreatment.amount_paid || 0) <
                        Number(selectedTreatment.treatment_price || 0) && (
                            <Button
                                variant="contained"
                                startIcon={<PaymentsIcon />}
                                onClick={() =>
                                    handleAddPayment(selectedTreatment)
                                }
                                sx={{
                                    bgcolor: "#B68FFF",
                                    "&:hover": {
                                        bgcolor: "#A256E8"
                                    }
                                }}
                            >
                                הוספת תשלום
                            </Button>
                        )}

                    <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() =>
                            editTreatment(
                                selectedTreatment
                            )
                        }
                    >
                        עריכה
                    </Button>

                    {canDelete(selectedTreatment) && (
                        <Button
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() =>
                                deleteTreatment(
                                    selectedTreatment
                                )
                            }
                        >
                            מחיקה
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
