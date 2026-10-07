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

function createData(
    treatment_id,
    treatment_type_id,
    treatment_type,
    treatment_date,
    duration,
    summary,
    treatment_price,
    amount_paid,
    debt,
    is_special_price,
    price_note
) {
    return {
        treatment_id,
        treatment_type_id,
        treatment_type,
        treatment_date,
        duration,
        summary,

        treatment_price: Number(treatment_price || 0),
        amount_paid: Number(amount_paid || 0),
        debt: Number(debt || 0),

        is_special_price: Boolean(is_special_price),
        price_note: price_note || ""
    };
}

const headCells = [
    {
        id: 'treatment_type',
        numeric: false,
        disablePadding: true,
        label: 'סוג הטיפול'
    },
    {
        id: 'treatment_date',
        numeric: false,
        disablePadding: false,
        label: 'תאריך'
    },
    {
        id: 'duration',
        numeric: true,
        disablePadding: false,
        label: 'זמן הטיפול'
    },
    {
        id: 'summary',
        numeric: false,
        disablePadding: false,
        label: 'סיכום'
    },
    {
        id: 'treatment_price',
        numeric: true,
        disablePadding: false,
        label: 'מחיר'
    },
    {
        id: 'amount_paid',
        numeric: true,
        disablePadding: false,
        label: 'שולם'
    },
    {
        id: 'debt',
        numeric: true,
        disablePadding: false,
        label: 'חוב'
    },
    {
        id: 'actions',
        numeric: false,
        disablePadding: false,
        label: 'פעולות'
    }
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


export default function ClientTreatments() {
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
        treatment_price: '',
        amount_paid: 0,
        is_special_price: false,
        price_note: ''
    });
    const [errors, setErrors] = useState({});
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newTreatment, setNewTreatment] = useState({
        treatment_type_id: "",
        type: "",
        date: new Date().toISOString().split("T")[0],
        duration: "",
        default_duration: "",
        summary: "",
        default_price: "",
        treatment_price: "",
        is_special_price: false,
        price_note: "",
        payment_amount: ""
    });
    const [treatmentTypes, setTreatmentTypes] = useState([]);
    const previousDataRef = useRef([]);

    const loadTreatments = React.useCallback(() => {
        const url = `treatments/${clientId}`;

        serverRequests('GET', url, null)
            .then(response => {
                if (!response.ok) {
                    throw new Error(
                        'Failed to load treatments'
                    );
                }

                return response.json();
            })
            .then(data => {

                const newTreatments =
                    data?.treatments?.map(t =>
                        createData(
                            t.treatment_id,
                            t.treatment_type_id,
                            t.treatment_type,
                            t.treatment_date,
                            t.duration,
                            t.summary,
                            t.treatment_price,
                            t.amount_paid,
                            t.debt,
                            t.is_special_price,
                            t.price_note
                        )
                    ) || [];

                setTreatments(newTreatments);

                previousDataRef.current =
                    newTreatments;
            })
            .catch(error => {
                console.error(
                    "Error loading treatments:",
                    error
                );

                toast.error(
                    "שגיאה בטעינת הטיפולים."
                );
            });

    }, [clientId]);


    useEffect(() => {
        loadTreatments();
    }, [loadTreatments]);

    useEffect(() => {
        serverRequests("GET", "treatment-types", null)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to load treatment types");
                }

                return response.json();
            })
            .then(data => {
                setTreatmentTypes(data.treatmentTypes || []);
            })
            .catch(error => {
                console.error(
                    "Error loading treatment types:",
                    error
                );

                toast.error("שגיאה בטעינת סוגי הטיפולים.");
            });
    }, []);

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

        if (Number(treatment.amount_paid) > 0) {
            toast.error(
                'לא ניתן למחוק טיפול שכבר בוצע עבורו תשלום.'
            );
            return;
        }

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
            .then(async (response) => {
                if (!response.ok) {
                    const errorData =
                        await response.json().catch(() => ({}));

                    throw new Error(
                        errorData.error ||
                        'לא ניתן למחוק את הטיפול.'
                    );
                }
                setTreatments(
                    treatments.filter(
                        treatment =>
                            treatment.treatment_id !==
                            currentTreatmentToDelete.treatment_id
                    )
                );
                toast.success('הטיפול נמחק בהצלחה!');
                handleCloseDeleteModal();
            })
            .catch(error => {
                console.error(
                    'Error deleting treatment:',
                    error
                );
                toast.error(
                    error.message ||
                    'שגיאה בעת מחיקת הטיפול.'
                );
            });
    };
    const handleCloseAddModal = () => {
        setAddModalOpen(false);

        setNewTreatment({
            treatment_type_id: "",
            type: "",
            date: new Date().toISOString().split("T")[0],
            duration: "",
            summary: "",
            default_price: "",
            treatment_price: "",
            is_special_price: false,
            price_note: "",
            payment_amount: ""
        });

        setErrors({});
    };

    const handleOpenEditModal = (treatment) => {
        setEditTreatment({
            treatment_id: treatment.treatment_id,
            summary: treatment.summary || '',
            treatment_price: treatment.treatment_price,
            amount_paid: treatment.amount_paid || 0,
            is_special_price: treatment.is_special_price || false,
            price_note: treatment.price_note || ''
        });

        setErrors({});
        setEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);

        setEditTreatment({
            treatment_id: null,
            summary: '',
            treatment_price: '',
            amount_paid: 0,
            is_special_price: false,
            price_note: ''
        });

        setErrors({});
    };

    const handleSaveEditWithValidation = (treatment) => {
        const validationErrors = {};

        if (
            !treatment.summary ||
            treatment.summary.trim() === ''
        ) {
            validationErrors.summary =
                'יש להזין סיכום טיפול.';
        }

        if (
            treatment.treatment_price === '' ||
            treatment.treatment_price === null ||
            isNaN(Number(treatment.treatment_price)) ||
            Number(treatment.treatment_price) < 0
        ) {
            validationErrors.treatment_price =
                'יש להזין מחיר טיפול תקין.';
        }

        /*
            We do not allow lowering the treatment price
            below the amount that has already been paid.
        */
        if (
            Number(treatment.treatment_price) <
            Number(treatment.amount_paid || 0)
        ) {
            validationErrors.treatment_price =
                'מחיר הטיפול לא יכול להיות נמוך מהסכום שכבר שולם.';
        }

        return validationErrors;
    };

    const handleSaveEdit = () => {
        const validationErrors =
            handleSaveEditWithValidation(editTreatment);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const url =
            `treatments/${editTreatment.treatment_id}`;

        serverRequests('PUT', url, {
            summary: editTreatment.summary,

            treatment_price:
                Number(editTreatment.treatment_price),

            is_special_price:
                editTreatment.is_special_price,

            price_note:
                editTreatment.price_note || null
        })
            .then(async (response) => {
                if (!response.ok) {
                    const errorData =
                        await response.json().catch(() => ({}));

                    throw new Error(
                        errorData.error ||
                        'Failed to edit treatment'
                    );
                }

                return response.json();
            })
            .then(() => {
                toast.success(
                    'פרטי הטיפול עודכנו בהצלחה!'
                );

                setErrors({});
                handleCloseEditModal();

                // Reload from server so debt/payment values
                // are always calculated from the real DB data
                loadTreatments();
            })
            .catch((error) => {
                console.error(
                    'Error editing treatment:',
                    error
                );

                toast.error(
                    error.message ||
                    'שגיאה בעת עדכון הפרטים. נסי שוב.'
                );
            });
    };

    useEffect(() => {
        serverRequests("GET", "treatment-types", null)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to load treatment types");
                }

                return response.json();
            })
            .then(data => {
                setTreatmentTypes(data.treatmentTypes || []);
            })
            .catch(error => {
                console.error(
                    "Error loading treatment types:",
                    error
                );

                toast.error("שגיאה בטעינת סוגי הטיפולים.");
            });
    }, []);

    const handleValidation = (treatment) => {
        const validationErrors = {};

        if (!treatment.treatment_type_id) {
            validationErrors.type =
                "יש לבחור סוג טיפול.";
        }

        if (!treatment.date) {
            validationErrors.date =
                "יש לבחור תאריך.";
        }

        if (
            !treatment.duration ||
            Number(treatment.duration) <= 0
        ) {
            validationErrors.duration =
                "יש להזין משך טיפול תקין.";
        }

        if (
            !treatment.summary ||
            treatment.summary.trim() === ""
        ) {
            validationErrors.summary =
                "יש להזין סיכום טיפול.";
        }

        /*
            Only validate price if a special price
            was selected.
        */
        if (treatment.is_special_price) {
            if (
                treatment.treatment_price === '' ||
                isNaN(Number(treatment.treatment_price)) ||
                Number(treatment.treatment_price) < 0
            ) {
                validationErrors.treatment_price =
                    "יש להזין מחיר מיוחד תקין.";
            }
        }

        return validationErrors;
    };


    const handleSaveTreatment = (clientId) => {
        const validationErrors =
            handleValidation(newTreatment);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const treatmentToSave = {
            client_id: clientId,
            treatment_type_id:
                newTreatment.treatment_type_id,
            treatment_date:
                newTreatment.date,
            duration:
                Number(newTreatment.duration),
            summary:
                newTreatment.summary,
            is_special_price:
                newTreatment.is_special_price,
            price_note:
                newTreatment.is_special_price
                    ? newTreatment.price_note || null
                    : null,
            payment_amount: Number(newTreatment.payment_amount || 0)
        };


        /*
            If a special price was entered,
            send it to the server.
    
            Otherwise, do NOT send treatment_price.
            The Node model will take the current
            default price from treatment_types.
        */
        if (newTreatment.is_special_price) {
            treatmentToSave.treatment_price =
                Number(newTreatment.treatment_price);
        }


        serverRequests(
            "POST",
            "treatments",
            treatmentToSave
        )
            .then(async (response) => {
                if (!response.ok) {
                    const errorData =
                        await response.json().catch(() => ({}));

                    throw new Error(
                        errorData.error ||
                        "Failed to add treatment"
                    );
                }

                return response.json();
            })

            .then(() => {
                toast.success(
                    "הטיפול נוסף בהצלחה!"
                );

                setAddModalOpen(false);

                setNewTreatment({
                    treatment_type_id: "",
                    type: "",

                    date:
                        new Date()
                            .toISOString()
                            .split("T")[0],

                    duration: 90,
                    summary: "",

                    treatment_price: "",
                    is_special_price: false,
                    price_note: ""
                });

                setErrors({});

                /*
                    Do not manually add the treatment
                    to React state.
    
                    Reload it from the server so we receive:
                    - real treatment_id
                    - default treatment price
                    - amount_paid
                    - debt
                    - special price information
                */
                loadTreatments();
            })

            .catch((error) => {
                console.error(
                    "Error adding treatment:",
                    error
                );

                toast.error(
                    error.message ||
                    "שגיאה בעת הוספת טיפול. נסי שוב."
                );
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
            <Dialog
                open={addModalOpen}
                onClose={handleCloseAddModal}
                dir="rtl"
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    הוספת טיפול חדש
                </DialogTitle>

                <DialogContent>

                    {/* סוג טיפול */}
                    <Box sx={{ mb: 2 }}>
                        <Box
                            display="flex"
                            flexWrap="wrap"
                            gap={1}
                        >
                            {treatmentTypes.map((type) => (
                                <Chip
                                    key={type.treatment_type_id}
                                    label={type.treatment_name}
                                    clickable

                                    onClick={() =>
                                        setNewTreatment(prev => ({
                                            ...prev,
                                            treatment_type_id: type.treatment_type_id,
                                            type: type.treatment_name,
                                            default_duration: type.default_duration || "",
                                            duration: type.default_duration || "",
                                            default_price: Number(type.default_price),
                                            treatment_price: Number(type.default_price),
                                            is_special_price: false,
                                            price_note: ""
                                        }))
                                    }

                                    sx={{
                                        backgroundColor:
                                            newTreatment.treatment_type_id === type.treatment_type_id
                                                ? "#B68FFF"
                                                : "transparent",

                                        border: "2px solid #B68FFF",

                                        color:
                                            newTreatment.treatment_type_id === type.treatment_type_id
                                                ? "white"
                                                : "#B68FFF",

                                        "&:hover": {
                                            backgroundColor:
                                                newTreatment.treatment_type_id === type.treatment_type_id
                                                    ? "#B68FFF"
                                                    : "rgba(182, 143, 255, 0.1)"
                                        }
                                    }}
                                />
                            ))}
                        </Box>

                        {errors.type && (
                            <Typography
                                variant="body2"
                                color="error"
                                sx={{ mt: 1 }}
                            >
                                {errors.type}
                            </Typography>
                        )}
                    </Box>


                    {/* מחיר + משך ברירת מחדל */}
                    {newTreatment.treatment_type_id && (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                px: 2,
                                py: 1.5,
                                mb: 3,
                                borderRadius: 2,
                                backgroundColor: "#f7f7f7"
                            }}
                        >
                            <Typography>
                                מחיר מחירון:{" "}
                                <strong>
                                    {Number(newTreatment.default_price || 0).toFixed(2)} ₪
                                </strong>
                            </Typography>

                            <Typography>
                                משך זמן טיפול מומלץ:{" "}
                                <strong>
                                    {newTreatment.default_duration} דקות
                                </strong>
                            </Typography>
                        </Box>
                    )}


                    {/* תאריך + משך טיפול */}
                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            mb: 3
                        }}
                    >
                        <TextField
                            id="date"
                            label="תאריך"
                            type="date"
                            fullWidth

                            value={newTreatment.date}

                            onChange={(e) =>
                                setNewTreatment({
                                    ...newTreatment,
                                    date: e.target.value
                                })
                            }

                            error={!!errors.date}
                            helperText={errors.date}

                            InputLabelProps={{
                                shrink: true
                            }}
                        />

                        <TextField
                            id="duration"
                            label="משך טיפול (בדקות)"
                            type="number"
                            fullWidth

                            value={newTreatment.duration}

                            onChange={(e) =>
                                setNewTreatment({
                                    ...newTreatment,
                                    duration: e.target.value
                                })
                            }

                            error={!!errors.duration}
                            helperText={errors.duration}

                            InputLabelProps={{
                                shrink: true
                            }}

                            inputProps={{
                                min: 1
                            }}
                        />
                    </Box>


                    {/* סיכום */}
                    <TextField
                        id="summary"
                        label="סיכום טיפול"
                        multiline
                        fullWidth
                        rows={4}

                        value={newTreatment.summary}

                        onChange={(e) =>
                            setNewTreatment({
                                ...newTreatment,
                                summary: e.target.value
                            })
                        }

                        error={!!errors.summary}
                        helperText={errors.summary}

                        InputLabelProps={{
                            shrink: true
                        }}

                        sx={{
                            mb: 2
                        }}
                    />


                    {/* מחיר מיוחד */}
                    <Box
                        sx={{
                            mt: 1,
                            mb: 1
                        }}
                    >
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newTreatment.is_special_price}

                                    disabled={!newTreatment.treatment_type_id}

                                    onChange={(e) => {
                                        const checked = e.target.checked;

                                        setNewTreatment(prev => ({
                                            ...prev,

                                            is_special_price: checked,

                                            treatment_price: checked
                                                ? prev.treatment_price
                                                : prev.default_price,

                                            price_note: checked
                                                ? prev.price_note
                                                : ""
                                        }));
                                    }}
                                />
                            }

                            label="מחיר מיוחד לטיפול זה"
                        />
                    </Box>


                    {/* שדות מחיר מיוחד */}
                    {newTreatment.is_special_price && (
                        <Box
                            sx={{
                                display: "flex",
                                gap: 2,
                                mt: 2
                            }}
                        >
                            <TextField
                                id="treatment-price"
                                label="מחיר מיוחד"
                                type="number"
                                fullWidth

                                value={newTreatment.treatment_price}

                                onChange={(e) =>
                                    setNewTreatment({
                                        ...newTreatment,
                                        treatment_price: e.target.value
                                    })
                                }

                                error={!!errors.treatment_price}
                                helperText={errors.treatment_price}

                                inputProps={{
                                    min: 0,
                                    step: "0.01"
                                }}

                                InputProps={{
                                    endAdornment: <span>₪</span>
                                }}
                            />

                            <TextField
                                id="price-note"
                                label="הערה למחיר"
                                fullWidth

                                value={newTreatment.price_note}

                                onChange={(e) =>
                                    setNewTreatment({
                                        ...newTreatment,
                                        price_note: e.target.value
                                    })
                                }

                                placeholder="לדוגמה: מחיר מבצע"
                            />
                        </Box>
                    )}

                    {/* תשלום */}
                    <Box
                        sx={{
                            mt: 3,
                            pt: 2,
                            borderTop: "1px solid #e0e0e0"
                        }}
                    >
                        <Typography
                            variant="subtitle1"
                            sx={{ mb: 1, fontWeight: "bold" }}
                        >
                            תשלום
                        </Typography>

                        <TextField
                            label="סכום ששולם"
                            type="number"
                            fullWidth
                            value={newTreatment.payment_amount}
                            onChange={(e) =>
                                setNewTreatment(prev => ({
                                    ...prev,
                                    payment_amount: e.target.value
                                }))
                            }
                            inputProps={{
                                min: 0,
                                step: "0.01"
                            }}
                            InputProps={{
                                endAdornment: <span>₪</span>
                            }}
                            placeholder="0"
                        />

                        {newTreatment.payment_amount !== "" &&
                            newTreatment.treatment_type_id && (
                                <Box sx={{ mt: 1.5 }}>
                                    {Number(newTreatment.payment_amount) <
                                        Number(newTreatment.treatment_price) ? (
                                        <Typography color="error">
                                            יישאר חוב של{" "}
                                            <strong>
                                                {(
                                                    Number(newTreatment.treatment_price) -
                                                    Number(newTreatment.payment_amount)
                                                ).toFixed(2)} ₪
                                            </strong>
                                        </Typography>
                                    ) : Number(newTreatment.payment_amount) >
                                        Number(newTreatment.treatment_price) ? (
                                        <Typography sx={{ color: "#8B5CF6" }}>
                                            הטיפול ישולם במלואו ו־
                                            <strong>
                                                {(
                                                    Number(newTreatment.payment_amount) -
                                                    Number(newTreatment.treatment_price)
                                                ).toFixed(2)} ₪
                                            </strong>{" "}
                                            יישארו כיתרת זכות
                                        </Typography>
                                    ) : (
                                        <Typography color="success.main">
                                            הטיפול ישולם במלואו
                                        </Typography>
                                    )}
                                </Box>
                            )}
                    </Box>

                </DialogContent>


                <DialogActions
                    sx={{
                        px: 3,
                        pb: 2
                    }}
                >
                    <Button
                        onClick={() => handleSaveTreatment(clientId)}
                        color="primary"
                    >
                        שמירה
                    </Button>

                    <Button
                        onClick={handleCloseAddModal}
                        color="primary"
                    >
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
                                                <TableCell align="center">
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: 0.7
                                                        }}
                                                    >
                                                        <span>
                                                            {Number(row.treatment_price).toFixed(2)} ₪
                                                        </span>

                                                        {row.is_special_price && (
                                                            <Chip
                                                                label="מחיר מיוחד"
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{
                                                                    color: '#8E55D6',
                                                                    borderColor: '#B68FFF',
                                                                    backgroundColor: 'rgba(182, 143, 255, 0.12)',
                                                                    fontWeight: 'bold'
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                </TableCell>

                                                <TableCell align="center">
                                                    {Number(row.amount_paid).toFixed(2)} ₪
                                                </TableCell>

                                                <TableCell align="center">
                                                    {Number(row.debt) > 0 ? (
                                                        <Chip
                                                            label={`חוב ${Number(row.debt).toFixed(2)} ₪`}
                                                            color="error"
                                                            variant="outlined"
                                                            sx={{
                                                                fontWeight: 'bold'
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
                                            <TableCell colSpan={9} />
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
                fullWidth
                maxWidth="sm"
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
                                    checked={editTreatment.is_special_price}
                                    onChange={(e) =>
                                        setEditTreatment({
                                            ...editTreatment,
                                            is_special_price: e.target.checked,
                                            price_note: e.target.checked
                                                ? editTreatment.price_note
                                                : ''
                                        })
                                    }
                                />
                            }
                            label="מחיר מיוחד לטיפול זה"
                        />
                    </Box>

                    <TextField
                        margin="dense"
                        id="edit-treatment-price"
                        label="מחיר הטיפול"
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={editTreatment.treatment_price}
                        onChange={(e) =>
                            setEditTreatment({
                                ...editTreatment,
                                treatment_price: e.target.value
                            })
                        }
                        disabled={!editTreatment.is_special_price}
                        error={!!errors.treatment_price}
                        helperText={
                            errors.treatment_price ||
                            (
                                editTreatment.is_special_price
                                    ? "המחיר הזה ישפיע רק על הטיפול הנוכחי."
                                    : "המחיר המקורי של הטיפול."
                            )
                        }
                        inputProps={{
                            min: 0,
                            step: "0.01"
                        }}
                        sx={{ marginBottom: 2 }}
                    />

                    {editTreatment.is_special_price && (
                        <TextField
                            margin="dense"
                            id="edit-price-note"
                            label="הערה למחיר המיוחד"
                            fullWidth
                            variant="outlined"
                            value={editTreatment.price_note}
                            onChange={(e) =>
                                setEditTreatment({
                                    ...editTreatment,
                                    price_note: e.target.value
                                })
                            }
                            placeholder="לדוגמה: מחיר מבצע"
                            sx={{ marginBottom: 2 }}
                        />
                    )}

                    <Box
                        sx={{
                            marginTop: 2,
                            padding: 2,
                            backgroundColor: '#f7f7f7',
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="body1">
                            מחיר הטיפול:{" "}
                            <strong>
                                {Number(editTreatment.treatment_price || 0).toFixed(2)} ₪
                            </strong>
                        </Typography>

                        <Typography variant="body1">
                            שולם עד כה:{" "}
                            <strong>
                                {Number(editTreatment.amount_paid || 0).toFixed(2)} ₪
                            </strong>
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{
                                color:
                                    Number(editTreatment.treatment_price || 0) -
                                        Number(editTreatment.amount_paid || 0) >
                                        0
                                        ? 'error.main'
                                        : 'success.main',
                                fontWeight: 'bold',
                                marginTop: 1
                            }}
                        >
                            {Math.max(
                                Number(editTreatment.treatment_price || 0) -
                                Number(editTreatment.amount_paid || 0),
                                0
                            ) > 0
                                ? `חוב: ${Math.max(
                                    Number(editTreatment.treatment_price || 0) -
                                    Number(editTreatment.amount_paid || 0),
                                    0
                                ).toFixed(2)} ₪`
                                : 'שולם במלואו'}
                        </Typography>
                    </Box>
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
