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
    Tooltip,
    ListItemIcon,
    ListItemText
} from "@mui/material";

import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import PaymentsIcon from "@mui/icons-material/Payments";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";

import {
    menuPaperSx,
    menuItemSx,
    dangerMenuItemSx,
    menuIconSx,
    dangerMenuIconSx,
    menuTextProps,
    paidChipSx,
    debtChipSx,
    specialPriceChipSx,
    primaryButtonSx,
    outlinedPurpleButtonSx,
    detailsDialogTitleSx,
    detailsSectionBoxSx,
    detailLabelSx,
    detailValueSx
} from "./shared/entityUiStyles";

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
            variant="outlined"
            size="small"
            sx={debtChipSx}
        />
    ) : (
        <Chip
            label="שולם"
            variant="outlined"
            size="small"
            sx={paidChipSx}
        />
    );
}

function DetailField({ label, children }) {
    return (
        <Box sx={{ mb: 2.25 }}>
            <Typography sx={detailLabelSx}>
                {label}
            </Typography>

            <Typography sx={detailValueSx}>
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
                                        spacing={1}
                                        alignItems="center"
                                        justifyContent="center"
                                        sx={{ py: 0.75 }}
                                    >
                                        <Typography fontWeight={500}>
                                            {money(treatment.treatment_price)}
                                        </Typography>

                                        {Boolean(treatment.is_special_price) && (
                                            <Chip
                                                label="מחיר מיוחד"
                                                size="small"
                                                variant="outlined"
                                                sx={specialPriceChipSx}
                                            />
                                        )}
                                    </Stack>
                                </TableCell>

                                <TableCell align="center" sx={{ py: 2.25 }}>
                                    <Typography fontWeight={500}>
                                        {money(treatment.amount_paid)}
                                    </Typography>
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

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={closeMenu}
                transformOrigin={{
                    horizontal: "right",
                    vertical: "top"
                }}
                anchorOrigin={{
                    horizontal: "right",
                    vertical: "bottom"
                }}
                PaperProps={{
                    elevation: 6,
                    sx: menuPaperSx
                }}
            >
                <MenuItem
                    onClick={() => openDetails(selectedTreatment)}
                    sx={menuItemSx}
                >
                    <ListItemIcon sx={menuIconSx}>
                        <ArticleOutlinedIcon fontSize="small" />
                    </ListItemIcon>

                    <ListItemText
                        primary="פרטי טיפול"
                        {...menuTextProps}
                    />
                </MenuItem>

                {selectedTreatment &&
                    Number(selectedTreatment.amount_paid || 0) <
                    Number(selectedTreatment.treatment_price || 0) && (
                        <MenuItem
                            onClick={() =>
                                handleAddPayment(selectedTreatment)
                            }
                            sx={menuItemSx}
                        >
                            <ListItemIcon sx={menuIconSx}>
                                <PaymentsIcon fontSize="small" />
                            </ListItemIcon>

                            <ListItemText
                                primary="הוספת תשלום"
                                {...menuTextProps}
                            />
                        </MenuItem>
                    )}

                <MenuItem
                    onClick={() => editTreatment(selectedTreatment)}
                    sx={menuItemSx}
                >
                    <ListItemIcon sx={menuIconSx}>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>

                    <ListItemText
                        primary="עריכת טיפול"
                        {...menuTextProps}
                    />
                </MenuItem>

                {canDelete(selectedTreatment) && (
                    <MenuItem
                        onClick={() =>
                            deleteTreatment(selectedTreatment)
                        }
                        sx={dangerMenuItemSx}
                    >
                        <ListItemIcon sx={dangerMenuIconSx}>
                            <DeleteIcon fontSize="small" />
                        </ListItemIcon>

                        <ListItemText
                            primary="מחיקת טיפול"
                            {...menuTextProps}
                        />
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
                <DialogTitle sx={detailsDialogTitleSx}>
                    פרטי הטיפול

                    <IconButton onClick={() => setDetailsOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {selectedTreatment && (
                        <>
                            <Box sx={detailsSectionBoxSx}>
                                <DetailField label="סוג הטיפול">
                                    {selectedTreatment.treatment_type ||
                                        selectedTreatment.treatment_name}
                                </DetailField>

                                <DetailField label="תאריך">
                                    {formatDate(selectedTreatment.treatment_date)}
                                </DetailField>

                                <DetailField label="משך הטיפול">
                                    {selectedTreatment.duration} דקות
                                </DetailField>
                            </Box>

                            <Box sx={detailsSectionBoxSx}>
                                <DetailField label="סיכום הטיפול">
                                    {selectedTreatment.summary ||
                                        "לא הוזן סיכום טיפול"}
                                </DetailField>
                            </Box>

                            <Box sx={detailsSectionBoxSx}>
                                <DetailField label="מחיר הטיפול">
                                    {money(selectedTreatment.treatment_price)}
                                </DetailField>

                                {Boolean(selectedTreatment.is_special_price) && (
                                    <Box sx={{ mb: 2.25 }}>
                                        <Typography sx={detailLabelSx}>
                                            סוג מחיר
                                        </Typography>

                                        <Chip
                                            label="מחיר מיוחד"
                                            variant="outlined"
                                            size="small"
                                            sx={specialPriceChipSx}
                                        />
                                    </Box>
                                )}

                                {Boolean(selectedTreatment.is_special_price) && (
                                    <DetailField label="הערה למחיר מיוחד">
                                        {selectedTreatment.price_note || "מחיר מיוחד"}
                                    </DetailField>
                                )}
                            </Box>

                            <Box sx={detailsSectionBoxSx}>
                                <DetailField label="כבר שולם">
                                    {money(selectedTreatment.amount_paid)}
                                </DetailField>

                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 2,
                                        flexWrap: "wrap"
                                    }}
                                >
                                    <Typography sx={detailLabelSx}>
                                        מצב התשלום
                                    </Typography>

                                    <DebtChip treatment={selectedTreatment} />
                                </Box>
                            </Box>
                        </>
                    )}
                </DialogContent>

                <DialogActions
                    sx={{
                        p: 2,
                        justifyContent: "flex-start",
                        gap: 1,
                        borderTop: "1px solid #F1F1F1"
                    }}
                >
                    <Button
                        onClick={() => setDetailsOpen(false)}
                        sx={outlinedPurpleButtonSx}
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
                                sx={primaryButtonSx}
                            >
                                הוספת תשלום
                            </Button>
                        )}

                    <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => editTreatment(selectedTreatment)}
                        sx={outlinedPurpleButtonSx}
                    >
                        עריכה
                    </Button>

                    {canDelete(selectedTreatment) && (
                        <Button
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() =>
                                deleteTreatment(selectedTreatment)
                            }
                            sx={{
                                borderRadius: 1.75,
                                px: 2.2
                            }}
                        >
                            מחיקה
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
