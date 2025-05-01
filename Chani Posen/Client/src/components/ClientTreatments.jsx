import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import { visuallyHidden } from '@mui/utils';
import { serverRequests } from '../Api';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import Tooltip from '@mui/material/Tooltip';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useOutletContext } from 'react-router-dom';

function createData(treatment_id, treatment_type, treatment_date, duration, summary, status, amount) {
    return { treatment_id, treatment_type, treatment_date, duration, summary, status, amount };
}

const headCells = [
    { id: 'treatment_type', numeric: false, disablePadding: true, label: 'סוג הטיפול' },
    { id: 'treatment_date', numeric: false, disablePadding: false, label: 'תאריך' },
    { id: 'duration', numeric: true, disablePadding: false, label: 'זמן הטיפול' },
    { id: 'summary', numeric: false, disablePadding: false, label: 'סיכום' },
    { id: 'status', numeric: false, disablePadding: false, label: 'האם שולם?' },
    { id: 'amount', numeric: true, disablePadding: false, label: 'סכום (\u20AA)' },
    { id: 'actions', numeric: false, disablePadding: false, label: 'פעולות' }, 
];


function descendingComparator(a, b, orderBy) {
    if (b[orderBy] > a[orderBy]) return -1;
    if (b[orderBy] < a[orderBy]) return 1;
    return 0;
}

function getComparator(order, orderBy) {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
}

function EnhancedTableHead(props) {
    const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };

    return (
        <TableHead>
            <TableRow>
                <TableCell padding="checkbox">
                    <Checkbox
                        color="primary"
                        checked={numSelected === rowCount}
                        onChange={onSelectAllClick}
                        inputProps={{
                            'aria-label': 'select all desserts',
                        }}
                    />
                </TableCell>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'center' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}
                        >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <Box component="span" sx={visuallyHidden}>
                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                </Box>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

EnhancedTableHead.propTypes = {
    numSelected: PropTypes.number.isRequired,
    onRequestSort: PropTypes.func.isRequired,
    onSelectAllClick: PropTypes.func.isRequired,
    order: PropTypes.oneOf(['asc', 'desc']).isRequired,
    orderBy: PropTypes.string.isRequired,
    rowCount: PropTypes.number.isRequired,
};


export default function ClientTreatments( ) {
    const { clientId } = useOutletContext();
    const [treatments, setTreatments] = useState([]);
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('treatment_date');
    const [selected, setSelected] = useState([]);
    const [page, setPage] = useState(0);
    const [dense, setDense] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentTreatmentToDelete, setCurrentTreatmentToDelete] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editTreatment, setEditTreatment] = useState({
        treatment_id: null,
        summary: '',
        status: '',
        amount: '',
    });
    const [errors, setErrors] = useState({});
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newTreatment, setNewTreatment] = useState({
        type: "",
        date: new Date().toISOString().split("T")[0], // תאריך ברירת מחדל - היום
        duration: 90, // דקות
        summary: "",
        status: "לא שולם",
        amount: 0,
    });

    const previousDataRef = useRef([]);

    useEffect(() => {
        const url = `treatments/${clientId}`;
        serverRequests('GET', url, null)
            .then(response => response.json())
            .then(data => {
                const newTreatments = data?.treatments?.map(t => createData(
                    t.treatment_id,
                    t.treatment_type,
                    t.treatment_date,
                    t.duration,
                    t.summary,
                    t.status === 'Paid' ? 'שולם' : 'לא שולם',
                    t.amount
                )) || [];

                if (JSON.stringify(previousDataRef.current) !== JSON.stringify(newTreatments)) {
                    setTreatments(newTreatments);
                    previousDataRef.current = newTreatments;
                }
            });
    }, [clientId]);


    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = treatments.map((n) => n.treatment_id);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event, id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }

        setSelected(newSelected);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleChangeDense = (event) => {
        setDense(event.target.checked);
    };

    const handleOpenDeleteModal = (treatment) => {
        setCurrentTreatmentToDelete(treatment);
        setDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
        setCurrentTreatmentToDelete(null);
    };

    const handleConfirmDelete = () => {
        if (!currentTreatmentToDelete) return;

        const url = `treatments/${currentTreatmentToDelete.treatment_id}`;
        serverRequests('DELETE', url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete treatment');
                }
                setTreatments(treatments.filter(treatment => treatment.treatment_id !== currentTreatmentToDelete.treatment_id));

                toast.success('הטיפול נמחק בהצלחה!');
                handleCloseDeleteModal();
            })
            .catch(error => {
                console.error('Error deleting treatment:', error);
                toast.error('שגיאה בעת מחיקת הטיפול. נסי שוב.');
            });
    };


    const handleOpenEditModal = (treatment) => {
        setEditTreatment({
            treatment_id: treatment.treatment_id,
            summary: treatment.summary,
            status: treatment.status,
            amount: treatment.amount,
        });
        setEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setEditTreatment({
            treatment_id: null,
            summary: '',
            status: '',
            amount: '',
        });
    };

    const handleSaveEditWithValidation = (editTreatment) => {
        const errors = {};

        if (!editTreatment.summary || editTreatment.summary.trim() === '') {
            errors.summary = 'יש להזין סיכום טיפול.';
        }

        if (!editTreatment.status) {
            errors.status = 'יש לבחור סטטוס.';
        }

        if (editTreatment.status === 'שולם') {
            if (!editTreatment.amount || editTreatment.amount <= 0) {
                errors.amount = 'בבקשה הזיני את הסכום ששולם.';
            }
        }

        return errors;
    };

    const handleSaveEdit = () => {
        const validationErrors = handleSaveEditWithValidation(editTreatment);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const url = `treatments/${editTreatment.treatment_id}`;
        const statusMapping = {
            'שולם': 'Paid',
            'לא שולם': 'Unpaid',
        };
        const apiStatus = statusMapping[editTreatment.status] || 'Unpaid';

        serverRequests('PUT', url, {
            summary: editTreatment.summary,
            status: apiStatus,
            amount: apiStatus === 'Paid' ? editTreatment.amount : 0,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Failed to edit treatment');
                }
                setTreatments(treatments.map((treatment) =>
                    treatment.treatment_id === editTreatment.treatment_id
                        ? { ...treatment, ...editTreatment }
                        : treatment
                ));
                toast.success('הפרטים עודכנו בהצלחה!');
                setErrors({});
                handleCloseEditModal();
            })
            .catch((error) => {
                console.error('Error editing treatment:', error);
                toast.error('שגיאה בעת עדכון הפרטים. נסי שוב.');
            });
    };

    const treatmentTypes = [
        "בייסיק",
        "עמוק",
        "אנטי איגינג",
        "ספא",
        "אקנה",
        "פוסט אקנה",
        "מזותרפיה",
        "יופי",
        "אחר",
        "חלק מסדרה",
    ];

    const handleValidation = (treatment) => {
        const errors = {};
        if (!treatment.type) errors.type = "יש לבחור סוג טיפול.";
        if (!treatment.date) errors.date = "יש לבחור תאריך.";
        if (!treatment.duration || treatment.duration <= 0)
            errors.duration = "יש להזין משך טיפול תקין.";
        if (!treatment.summary || treatment.summary.trim() === "")
            errors.summary = "יש להזין סיכום טיפול.";
        if (treatment.status === "שולם" && (!treatment.amount || treatment.amount <= 0))
            errors.amount = "בבקשה הזיני את הסכום ששולם.";
        const statusMapping = {
            'שולם': 'Paid',
            'לא שולם': 'Unpaid',
        };
        treatment.status = statusMapping[treatment.status] || 'Unpaid';
        return errors;
    };

    const handleSaveTreatment = (clientId) => {
        const validationErrors = handleValidation(newTreatment);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const treatmentToSave = {
            treatment_type: newTreatment.type,
            treatment_date: newTreatment.date,
            client_id: clientId,
            duration: newTreatment.duration,
            summary: newTreatment.summary,
            status: newTreatment.status,
            amount: newTreatment.amount
        };

        serverRequests("POST", "treatments", treatmentToSave)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to add treatment");
                }
                return response.json(); // קבלת תגובת השרת
            })
            .then((data) => {
                // אם השרת החזיר את ה- treatment_id, נוסיף אותו
                const savedTreatment = {
                    ...treatmentToSave,
                    treatment_id: data.treatment_id, // הטיפול החדש עם ה-treatment_id
                };

                toast.success("הטיפול נוסף בהצלחה!");
                setTreatments((prevTreatments) => [
                    ...prevTreatments,
                    createData(
                        savedTreatment.treatment_id,
                        savedTreatment.treatment_type,
                        savedTreatment.treatment_date,
                        savedTreatment.duration,
                        savedTreatment.summary,
                        savedTreatment.status === "Paid" ? "שולם" : "לא שולם",
                        savedTreatment.amount
                    ),
                ]);
                setAddModalOpen(false);
                setNewTreatment({
                    type: "",
                    date: new Date().toISOString().split("T")[0],
                    duration: 90,
                    summary: "",
                    status: "Unpaid",
                    amount: 0,
                });
                setErrors({});
            })
            .catch((error) => {
                console.error("Error adding treatment:", error);
                toast.error("שגיאה בעת הוספת טיפול. נסי שוב.");
            });
    };

    const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - treatments.length) : 0;

    const visibleRows = React.useMemo(
        () =>
            [...treatments]
                .sort(getComparator(order, orderBy))
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [order, orderBy, page, rowsPerPage, treatments],
    );

    return (
        <Box sx={{ width: '100%', direction: 'ltr', position: 'relative' }}>
            <ToastContainer
                position="top-center"
                reverseOrder={false}
            />
            <Tooltip title="הוסיפי טיפול" arrow>
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={() => setAddModalOpen(true)}
                    sx={{
                        position: 'absolute',
                        top: '-3%',
                        left: '5%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#B68FFF',
                        color: '#fff',
                        '&:hover': {
                            backgroundColor: '#A256E8',
                        },
                    }}
                >
                    <AddIcon />
                </Fab>
            </Tooltip>
            <br></br><br></br><br></br>
            <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} dir="rtl">
                <DialogTitle>הוספת טיפול חדש</DialogTitle>
                <DialogContent>
                    <Box>
                        <Box display="flex" flexWrap="wrap" gap={1.5} sx={{ marginBottom: 2 }}>
                            {treatmentTypes.map((type) => (
                                <Chip
                                    key={type}
                                    label={type}
                                    clickable
                                    onClick={() => setNewTreatment({ ...newTreatment, type })}
                                    sx={{
                                        margin: 0.5,
                                        backgroundColor: newTreatment.type === type ? "#B68FFF" : "transparent",
                                        border: "2px solid #B68FFF",
                                        color: newTreatment.type === type ? "white" : "#B68FFF",
                                        fontSize: newTreatment.type === type ? "1rem" : "0.875rem",
                                        boxShadow: newTreatment.type === type ? "0px 0px 6px rgba(0, 0, 0, 0.3)" : "none",
                                        transition: "all 0.3s ease-in-out",
                                        "&:hover": {
                                            backgroundColor: newTreatment.type === type ? "#B68FFF" : "transparent",
                                        },
                                    }}
                                />
                            ))}
                        </Box>
                        {errors.type && <p style={{ color: "red" }}>{errors.type}</p>}
                    </Box>
                    <TextField
                        margin="dense"
                        id="date"
                        label="תאריך"
                        type="date"
                        fullWidth
                        value={newTreatment.date}
                        onChange={(e) =>
                            setNewTreatment({ ...newTreatment, date: e.target.value })
                        }
                        error={!!errors.date}
                        helperText={errors.date}
                        variant="outlined"
                        InputLabelProps={{
                            shrink: true,
                            style: { textAlign: "center" }, // מיקום תווית במרכז
                        }}
                        sx={{
                            "& .MuiInputBase-root": {
                                textAlign: "center", // טקסט בפנים
                            },
                            marginBottom: 4,
                        }}
                    />
                    <TextField
                        margin="dense"
                        id="duration"
                        label="משך טיפול (בדקות)"
                        type="number"
                        fullWidth
                        value={newTreatment.duration}
                        onChange={(e) =>
                            setNewTreatment({ ...newTreatment, duration: e.target.value })
                        }
                        error={!!errors.duration}
                        helperText={errors.duration}
                        variant="outlined"
                        InputLabelProps={{
                            shrink: true,
                            style: { textAlign: "center" }, // מיקום תווית במרכז
                        }}
                        sx={{
                            "& .MuiInputBase-root": {
                                textAlign: "center", // טקסט בפנים
                            },
                            marginBottom: 4,
                        }}
                    />
                    <TextField
                        margin="dense"
                        id="summary"
                        label="סיכום טיפול"
                        multiline
                        fullWidth
                        rows={4}
                        value={newTreatment.summary}
                        onChange={(e) =>
                            setNewTreatment({ ...newTreatment, summary: e.target.value })
                        }
                        error={!!errors.summary}
                        helperText={errors.summary}
                        variant="outlined"
                        InputLabelProps={{
                            shrink: true,
                            style: { textAlign: "center" }, // מיקום תווית במרכז
                        }}
                        sx={{
                            "& .MuiInputBase-root": {
                                textAlign: "center", // טקסט בפנים
                            },
                            marginBottom: 2,
                        }}

                    />
                    <Box mt={2}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newTreatment.status === "שולם"}
                                    onChange={(e) =>
                                        setNewTreatment({
                                            ...newTreatment,
                                            status: e.target.checked ? "שולם" : "לא שולם",
                                            amount: e.target.checked ? newTreatment.amount : 0,
                                        })
                                    }
                                />
                            }
                            label={newTreatment.status === "שולם" ? "שולם" : "לא שולם"}
                        />
                    </Box>
                    <TextField
                        margin="dense"
                        id="amount"
                        label="סכום ששולם"
                        type="number"
                        fullWidth
                        value={newTreatment.amount}
                        onChange={(e) =>
                            setNewTreatment({ ...newTreatment, amount: e.target.value })
                        }
                        disabled={newTreatment.status !== "שולם"}
                        InputProps={{
                            style: {
                                color: newTreatment.status === "שולם" ? "inherit" : "#999",
                            },
                        }}
                        error={!!errors.amount}
                        helperText={errors.amount}
                        variant="outlined"
                        InputLabelProps={{
                            shrink: true,
                            style: { textAlign: "center" }, // מיקום תווית במרכז
                        }}
                        sx={{
                            "& .MuiInputBase-root": {
                                textAlign: "center", // טקסט בפנים
                            },
                            marginBottom: 2,
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleSaveTreatment(clientId)} color="primary">
                        שמירה
                    </Button>
                    <Button onClick={() => { setAddModalOpen(false); setErrors({}); }} color="primary">
                        ביטול
                    </Button>
                </DialogActions>
            </Dialog>
            <Box sx={{ p: 5 }}>
                <Paper sx={{ width: '100%', mb: 2 }}>

                    <TableContainer>
                        {treatments.length === 0 ? (
                            <Typography
                                variant="h6"
                                align="center"
                                sx={{ padding: 2, color: 'gray' }}
                            >
                                אין עדיין טיפולים
                            </Typography>
                        ) : (
                            <Table
                                sx={{
                                    minWidth: 750,
                                    '& .MuiTableCell-root': {
                                        padding: '15px',
                                    }
                                }}
                                aria-labelledby="tableTitle"
                                size={dense ? 'small' : 'medium'}
                            >
                                <EnhancedTableHead
                                    numSelected={selected.length}
                                    order={order}
                                    orderBy={orderBy}
                                    onSelectAllClick={handleSelectAllClick}
                                    onRequestSort={handleRequestSort}
                                    rowCount={treatments.length}
                                />
                                <TableBody>
                                    {visibleRows.map((row, index) => {
                                        const isItemSelected = selected.includes(row.treatment_id);
                                        const labelId = `enhanced-table-checkbox-${index}`;

                                        return (
                                            <TableRow
                                                hover
                                                onClick={(event) => handleClick(event, row.treatment_id)}
                                                role="checkbox"
                                                aria-checked={isItemSelected}
                                                tabIndex={-1}
                                                key={row.treatment_id}
                                                selected={isItemSelected}
                                            >
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        color="primary"
                                                        checked={isItemSelected}
                                                        inputProps={{
                                                            'aria-labelledby': labelId,
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="left">{row.treatment_type}</TableCell>
                                                <TableCell align="left">{new Date(row.treatment_date).toLocaleDateString()}</TableCell>
                                                <TableCell align="center">{row.duration}</TableCell>
                                                <TableCell align="left" sx={{ minWidth: 200 }}>
                                                    {row.summary ? (
                                                        row.summary
                                                    ) : (
                                                        <Chip
                                                            label="חסר סיכום טיפול"
                                                            variant="outlined"
                                                            color="error"
                                                            onClick={() => handleOpenEditModal(row)}
                                                            sx={{
                                                                border: '2px solid red',
                                                                color: 'red',
                                                                fontWeight: 'bold',
                                                                cursor: 'pointer',
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell align="left">
                                                    <Chip
                                                        label={row.status}
                                                        color={row.status === 'שולם' ? 'success' : 'error'}
                                                        variant="outlined"
                                                        sx={{
                                                            borderRadius: '16px',
                                                            padding: '4px 10px',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">{row.amount}</TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => handleOpenEditModal(row)}
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => handleOpenDeleteModal(row)}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {emptyRows > 0 && (
                                        <TableRow style={{ height: (dense ? 33 : 53) * emptyRows }}>
                                            <TableCell colSpan={7} />
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={treatments.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </Paper>
                <FormControlLabel
                    control={<Switch checked={dense} onChange={handleChangeDense} />}
                    label="Dense View"
                />
            </Box>


            <Dialog open={isDeleteModalOpen} onClose={handleCloseDeleteModal} dir="rtl">
                <DialogTitle>אישור מחיקה</DialogTitle>
                <DialogContent>
                    {currentTreatmentToDelete && (
                        <Typography>
                            האם את בטוחה שאת רוצה למחוק את הטיפול? <br />
                            <strong>סוג:</strong> {currentTreatmentToDelete.treatment_type} <br />
                            <strong>תאריך:</strong> {new Date(currentTreatmentToDelete.treatment_date).toLocaleDateString()}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions style={{ justifyContent: 'flex-start' }}>
                    <Button onClick={handleConfirmDelete} color="error">
                        מחיקה
                    </Button>
                    <Button onClick={handleCloseDeleteModal} color="primary">
                        ביטול
                    </Button>

                </DialogActions>
            </Dialog>


            <Dialog
                open={editModalOpen}
                onClose={handleCloseEditModal}
                dir="rtl"

            >
                <DialogTitle>עריכת פרטי טיפול</DialogTitle>
                <DialogContent>
                    <TextField
                        margin="dense"
                        id="edit-summary"
                        multiline
                        fullWidth
                        variant="outlined"
                        rows={6}
                        value={editTreatment.summary}
                        onChange={(e) =>
                            setEditTreatment({ ...editTreatment, summary: e.target.value })
                        }
                        error={!!errors.summary}
                        helperText={errors.summary}
                        sx={{ marginBottom: 2 }}
                    />
                    <Box mt={2}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={editTreatment.status === 'שולם'}
                                    onChange={(e) =>
                                        setEditTreatment({
                                            ...editTreatment,
                                            status: e.target.checked ? 'שולם' : 'לא שולם',
                                            amount: e.target.checked ? editTreatment.amount : 0,
                                        })
                                    }
                                />
                            }
                            label={editTreatment.status === 'שולם' ? 'שולם' : 'לא שולם'}
                            sx={{ marginBottom: 2 }}
                        />
                    </Box>
                    <TextField
                        margin="dense"
                        id="edit-amount"
                        fullWidth
                        variant="outlined"
                        value={editTreatment.amount}
                        onChange={(e) =>
                            setEditTreatment({ ...editTreatment, amount: e.target.value })
                        }
                        disabled={editTreatment.status !== 'שולם'}
                        InputProps={{
                            style: {
                                color: editTreatment.status === 'שולם' ? 'inherit' : '#999',
                            },
                        }}
                        error={!!errors.amount}
                        helperText={errors.amount}
                        sx={{ marginBottom: 2 }}
                    />
                </DialogContent>
                <DialogActions sx={{ padding: 2 }}>
                    <Button onClick={handleSaveEdit} color="primary">
                        שמירה
                    </Button>
                    <Button onClick={handleCloseEditModal} color="primary">
                        ביטול
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
