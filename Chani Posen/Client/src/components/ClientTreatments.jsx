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
import TreatmentsTable from "./TreatmentsTable";
import AddTreatmentModal from "./AddTreatmentModal";
import EditTreatmentModal from "./EditTreatmentModal";
import TreatmentPaymentModal from "./TreatmentPaymentModal";

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


function descendingComparator(a, b, orderBy) {
    if (b[orderBy] > a[orderBy]) return -1;
    if (b[orderBy] < a[orderBy]) return 1;
    return 0;
}

function getComparator(order, orderBy) {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
}


export default function ClientTreatments() {
    const { clientId } = useOutletContext();
    const [treatments, setTreatments] = useState([]);
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
    const [paymentTreatment, setPaymentTreatment] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [savingTreatment, setSavingTreatment] = useState(false);
    const savingTreatmentRef = useRef(false);

    const handleOpenPaymentModal = (treatment) => {
        setPaymentTreatment(treatment);
        setPaymentModalOpen(true);
    };

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
            treatment_type_id: treatment.treatment_type_id,
            treatment_name:
                treatment.treatment_name ||
                treatment.treatment_type ||
                "",
            treatment_date: treatment.treatment_date,
            duration: treatment.duration,
            summary: treatment.summary || "",
            treatment_price: treatment.treatment_price,
            amount_paid: treatment.amount_paid || 0,
            is_special_price: Boolean(
                Number(treatment.is_special_price)
            ),
            price_note: treatment.price_note || ""
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

        if (!treatment.treatment_type_id) {
            validationErrors.type = "יש לבחור סוג טיפול";
        }

        if (
            !Number.isInteger(Number(treatment.duration)) ||
            Number(treatment.duration) <= 0
        ) {
            validationErrors.duration =
                "יש להזין משך טיפול תקין";
        }

        if (!treatment.summary?.trim()) {
            validationErrors.summary =
                "יש להזין סיכום טיפול";
        }

        const price = Number(treatment.treatment_price);

        if (
            treatment.treatment_price === "" ||
            treatment.treatment_price == null ||
            !Number.isFinite(price) ||
            price < 0 ||
            Math.abs(price * 100 - Math.round(price * 100)) > 1e-7
        ) {
            validationErrors.treatment_price =
                "יש להזין מחיר תקין, עד שתי ספרות אחרי הנקודה";
        }

        if (!treatment.treatment_date) {
            validationErrors.date =
                "יש להזין תאריך טיפול";
        }

        return validationErrors;
    };


    const handleSaveEdit = async () => {
        const validationErrors =
            handleSaveEditWithValidation(editTreatment);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const selectedType = treatmentTypes.find(
            (type) =>
                String(type.treatment_type_id) ===
                String(editTreatment.treatment_type_id)
        );

        const regularPrice = Number(selectedType?.default_price);
        const actualPrice = Number(editTreatment.treatment_price);

        const isActuallySpecial =
            Boolean(editTreatment.is_special_price) &&
            Number.isFinite(regularPrice) &&
            Math.round(actualPrice * 100) !==
            Math.round(regularPrice * 100);

        try {
            const response = await serverRequests(
                "PUT",
                `treatments/${editTreatment.treatment_id}`,
                {
                    treatment_type_id:
                        Number(editTreatment.treatment_type_id),


                    treatment_date:
                        typeof editTreatment.treatment_date === "string"
                            ? editTreatment.treatment_date.slice(0, 10)
                            : [
                                editTreatment.treatment_date.getFullYear(),
                                String(
                                    editTreatment.treatment_date.getMonth() + 1
                                ).padStart(2, "0"),
                                String(
                                    editTreatment.treatment_date.getDate()
                                ).padStart(2, "0")
                            ].join("-"),


                    duration:
                        Number(editTreatment.duration),

                    summary:
                        editTreatment.summary,

                    treatment_price:
                        Number(editTreatment.treatment_price),

                    is_special_price: isActuallySpecial,

                    price_note: isActuallySpecial
                        ? editTreatment.price_note || null
                        : null

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
                    "עדכון הטיפול נכשל"
                );
            }

            const refund = Number(
                data.refund_to_wallet || 0
            );

            if (refund > 0) {
                toast.success(
                    `הטיפול עודכן וזוכו ${refund.toFixed(2)} ₪ לארנק`
                );
            } else {
                toast.success(
                    "פרטי הטיפול עודכנו בהצלחה"
                );
            }

            handleCloseEditModal();
            await loadTreatments();

        } catch (error) {
            console.error(
                "Error updating treatment:",
                error
            );

            toast.error(
                error.message ||
                "שגיאה בעדכון הטיפול"
            );
        }
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




    const handleSaveTreatment = async (
        clientId,
        paymentOptions = {}
    ) => {
        // Prevent duplicate submissions.
        if (savingTreatmentRef.current) return;

        const validationErrors =
            handleValidation(newTreatment);

        const directAmount = Number(
            newTreatment.payment_amount || 0
        );

        // Use the value passed directly from the modal.
        // React state may not have updated yet.
        const walletAmount = Number(
            paymentOptions.walletAmount ?? 0
        );

        const validAmount = (amount) =>
            Number.isFinite(amount) &&
            amount >= 0 &&
            Math.abs(
                amount * 100 - Math.round(amount * 100)
            ) < 1e-7;

        if (!validAmount(directAmount)) {
            validationErrors.payment_amount =
                "סכום התשלום הישיר אינו תקין";
        }

        if (!validAmount(walletAmount)) {
            validationErrors.walletAmount =
                "סכום התשלום מהארנק אינו תקין";
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        savingTreatmentRef.current = true;
        setSavingTreatment(true);
        setErrors({});

        let saved = false;

        try {

            const regularPrice = Number(newTreatment.default_price);

            const actualPrice = newTreatment.is_special_price
                ? Number(newTreatment.treatment_price)
                : regularPrice;

            const isActuallySpecial =
                newTreatment.is_special_price &&
                Math.round(actualPrice * 100) !==
                Math.round(regularPrice * 100);

            const treatmentToSave = {
                client_id: clientId,

                treatment_type_id:
                    Number(newTreatment.treatment_type_id),

                treatment_date:
                    newTreatment.date,

                duration:
                    Number(newTreatment.duration),

                summary:
                    newTreatment.summary,


                is_special_price: isActuallySpecial,

                price_note: isActuallySpecial
                    ? newTreatment.price_note || null
                    : null,


                price_note:
                    newTreatment.is_special_price
                        ? newTreatment.price_note || null
                        : null,

                // New payments, not cumulative totals.
                directAmount:
                    directAmount.toFixed(2),

                walletAmount:
                    walletAmount.toFixed(2)
            };


            if (isActuallySpecial) {
                treatmentToSave.treatment_price = actualPrice;
            }

            const response = await serverRequests(
                "POST",
                "treatments",
                treatmentToSave
            );

            if (
                !response ||
                typeof response.json !== "function"
            ) {
                throw new Error(
                    "לא ניתן לקבל תשובה מהשרת. " +
                    "יש לבדוק אם הטיפול נשמר לפני ניסיון חוזר."
                );
            }

            const data = await response.json()
                .catch(() => null);

            if (!response.ok || data?.success !== true) {
                throw new Error(
                    data?.message ||
                    data?.error ||
                    "שמירת הטיפול נכשלה"
                );
            }

            saved = true;

            toast.success("הטיפול נוסף בהצלחה!");

            setAddModalOpen(false);

            setNewTreatment({
                treatment_type_id: "",
                type: "",
                date: new Date()
                    .toISOString()
                    .split("T")[0],
                duration: "",
                default_duration: "",
                summary: "",
                default_price: "",
                treatment_price: "",
                is_special_price: false,
                price_note: "",
                payment_amount: "",
                walletAmount: ""
            });

            // Reload the treatment with actual DB values.
            await loadTreatments();

        } catch (error) {
            console.error("Error adding treatment:", error);

            if (saved) {
                toast.warning(
                    "הטיפול נשמר, אך רענון הרשימה נכשל. " +
                    "יש לרענן את העמוד."
                );
            } else {
                toast.error(
                    error.message || "שגיאה בהוספת הטיפול"
                );
            }

        } finally {
            savingTreatmentRef.current = false;
            setSavingTreatment(false);
        }
    };



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

            <AddTreatmentModal
                open={addModalOpen}
                onClose={handleCloseAddModal}
                onSave={(paymentOptions) =>
                    handleSaveTreatment(clientId, paymentOptions)
                }
                clientId={clientId}
                newTreatment={newTreatment}
                setNewTreatment={setNewTreatment}
                treatmentTypes={treatmentTypes}
                errors={errors}
                saving={savingTreatment}
            />

            <Box sx={{ p: 3 }}>
                <TreatmentsTable
                    treatments={treatments}
                    onEdit={handleOpenEditModal}
                    onDelete={handleOpenDeleteModal}
                    onAddPayment={handleOpenPaymentModal}
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
            <EditTreatmentModal
                open={editModalOpen}
                onClose={handleCloseEditModal}
                onSave={handleSaveEdit}
                editTreatment={editTreatment}
                setEditTreatment={setEditTreatment}
                treatmentTypes={treatmentTypes}
                errors={errors}
            />

            <TreatmentPaymentModal
                open={paymentModalOpen}
                treatment={paymentTreatment}
                onClose={() => {
                    setPaymentModalOpen(false);
                    setPaymentTreatment(null);
                }}
                clientId={clientId}
                onSuccess={async (message) => {
                    toast.success(message);
                    setPaymentModalOpen(false);
                    setPaymentTreatment(null);
                    await loadTreatments();
                }}
                onError={(message) => {
                    toast.error(message);
                }}
            />
        </Box>
    );
}
