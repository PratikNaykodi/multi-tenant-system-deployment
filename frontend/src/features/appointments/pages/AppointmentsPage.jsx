import { useEffect, useState } from "react";
import {
    getAppointments,
    getAppointmentOptions,
    updateAppointment,
    deleteAppointment
} from "../services/appointmentService";

import AppointmentFormModal from "../components/AppointmentFormModal";

import { useAuth } from "../../../context/AuthContext";

import "./AppointmentsPage.css";
import { toast } from "react-toastify";
import socket from "../../../services/socket";

const AppointmentsPage = () => {
    const { user, tenant } = useAuth();

    // ==================================================
    // Appointment Data
    // ==================================================

    // Store appointments returned from the backend.
    const [appointments, setAppointments] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);

    const [totalPages, setTotalPages] = useState(1);

    const [totalAppointments, setTotalAppointments] = useState(0);

    const appointmentsPerPage = 10;

    const [ providers, setProviders ] = useState([]);

    const [
        patients,
        setPatients
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        error,
        setError
    ] = useState("");

    const [
        showModal,
        setShowModal
    ] = useState(false);

    const [
        selectedAppointment,
        setSelectedAppointment
    ] = useState(null);

    const [
        updatingStatusId,
        setUpdatingStatusId
    ] = useState(null);

    // ==================================================
    // Confirmation Modal
    // ==================================================

    const [
        confirmationModal,
        setConfirmationModal
    ] = useState({
        open: false,
        type: null,
        appointment: null,
        status: null
    });

    // ==================================================
    // Permissions
    // ==================================================
    const canCreate = user?.permissions?.includes("appointment.create");

    const canUpdate = user?.permissions?.includes("appointment.update");

    const canDelete = user?.permissions?.includes("appointment.delete");

    // ==================================================
    // Load data
    // ==================================================
    // ==================================================
    // Load Appointment Data
    // ==================================================
    //
    // Loads:
    //     1. Appointments for the selected page
    //     2. Providers
    //     3. Patients
    //
    // ==================================================

    const loadData = async (
            page = currentPage
        ) => {
        try {
            setLoading(true);
            setError("");

            const [
                appointmentResponse,
                optionsResponse
            ] = await Promise.all([
                getAppointments(
                    page,
                    appointmentsPerPage
                ),
                getAppointmentOptions()
            ]);

            // ------------------------------------------
            // Appointments
            // ------------------------------------------

            // Store appointments returned for the
            // selected page.
            setAppointments( appointmentResponse.appointments || [] );

            // ------------------------------------------
            // Pagination
            // ------------------------------------------

            // Store the current page returned by backend.
            setCurrentPage( appointmentResponse.pagination?.page || page );

            // Store total number of pages.
            setTotalPages( appointmentResponse.pagination?.totalPages || 1 );

            // Store total appointment count.
            setTotalAppointments( appointmentResponse.pagination?.total || 0 );

            // ------------------------------------------
            // Providers
            // ------------------------------------------
            setProviders( optionsResponse.providers || [] );

            // ------------------------------------------
            // Patients
            // ------------------------------------------
            setPatients( optionsResponse.patients || [] );

        } catch (error) {
            console.error("Error loading appointment data:", error);

            setError(error?.response?.data?.message || "Unable to load appointments" );
        } finally {
            setLoading(false);
        }
    };

    // ==================================================
    // Change Appointment Page
    // ==================================================
    //
    // Loads appointments for the selected page.
    //
    // ==================================================

    const handlePageChange = (page) => {
        // Prevent invalid page numbers.
        if (
            page < 1 ||
            page > totalPages
        ) {
            return;
        }

        // Load appointments for the selected page.
        loadData(page);
    };
    // ==================================================
    // Get Logged In Provider ID
    // ==================================================
    const getLoggedInProviderId = () => {

        if (user?.role !== "provider") {
            return null;
        }

        const currentProvider =
            providers.find(
                provider =>
                    Number(provider.user_id) ===
                    Number(user.id)
            );

        return (
            currentProvider?.provider_id ||
            null
        );
    };

    // JOIN PROVIDER SOCKET ROOM
    useEffect(() => {
        if (
            !user ||
            user.role !== "provider"
        ) {
            return;
        }

        if ( !tenant?.identifier ) {
            return;
        }

        if ( !providers.length ) {
            return;
        }

        const providerId = getLoggedInProviderId();

        if (!providerId) {
            return;
        }

        const room = `tenant_${tenant.identifier}_provider_${providerId}`;

        console.log( "Joining socket room:", room );

        socket.emit(
            "join_provider_room",
            {
                tenantId: tenant.identifier,
                providerId: providerId
            }
        );

    }, [
        user,
        tenant,
        providers
    ]);
    
    useEffect(() => {
        loadData();
    }, []);
    console.log(user.role)

    // Listen for New Appointment
    useEffect(() => {

        if (
            !user ||
            user.role !== "provider"
        ) {
            return;
        }

        const handleAppointmentCreated = (
            data
        ) => {
            console.log( "New appointment created:", data );
            // Reload the current appointment page
            // instead of always loading page 1.
            loadData(currentPage);
        };

        socket.on(
            "appointment_created",
            handleAppointmentCreated
        );

        return () => {
            socket.off(
                "appointment_created",
                handleAppointmentCreated
            );
        };
    }, [
        user,
        currentPage
    ]);

    // ==================================================
    // Create
    // ==================================================
    const handleCreate = () => {
        setSelectedAppointment(null);

        setShowModal(true);
    };

    // ==================================================
    // Edit
    // ==================================================
    const handleEdit = (appointment) => {
        setSelectedAppointment(appointment);
        setShowModal(true);
    };

    // ==================================================
    // Change Status
    // ==================================================
    const handleStatusChange = (
        appointment,
        status
    ) => {

        if ( appointment.status === status ) {
            return;
        }

        setConfirmationModal({
            open: true,
            type: "status",
            appointment: appointment,
            status: status
        });
    };

    const confirmStatusChange = async () => {

        const appointment = confirmationModal.appointment;

        const status = confirmationModal.status;

        if (!appointment || !status) {
            return;
        }

        try {
            setUpdatingStatusId(
                appointment.id
            );

            await updateAppointment(
                appointment.id,
                {
                    status
                }
            );

            toast.success( "Appointment status updated successfully!" );

            closeConfirmationModal();

            await loadData();
        } catch (error) {
            console.error( "Update appointment status error:", error );

            toast.error(
                error?.response?.data?.message ||
                "Unable to update appointment status"
            );
        } finally {
            setUpdatingStatusId(null);
        }
    };
    
    // ==================================================
    // Delete
    // ==================================================
    const handleDelete = (
        appointment
    ) => {
        setConfirmationModal({
            open: true,
            type: "delete",
            appointment: appointment,
            status: null
        });
    };

    const confirmDelete = async () => {
        const appointment = confirmationModal.appointment;

        if (!appointment) {
            return;
        }

        try {
            await deleteAppointment(
                appointment.id
            );

            toast.success( "Appointment deleted successfully!" );

            closeConfirmationModal();
            await loadData();
        } catch (error) {
            console.error( "Delete appointment error:", error );

            toast.error(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Unable to delete appointment"
            );

            closeConfirmationModal();
        }
    };

    // ==================================================
    // Date
    // ==================================================
    const formatDate = (
        date
    ) => {
        if (!date) {
            return "-";
        }

        const cleanDate = date.substring(0, 10);

        const dateObject = new Date(`${cleanDate}T00:00:00`);

        return dateObject.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    };

    // ==================================================
    // Time
    // ==================================================
    const formatTime = (
        time
    ) => {
        if (!time) {
            return "-";
        }

        return time.substring(0,5);
    };

    const closeConfirmationModal = () => {

        setConfirmationModal({
            open: false,
            type: null,
            appointment: null,
            status: null
        });
    };

    return (
        <div className="appointments-page">
            {/* =========================================
                HEADER
            ========================================== */}
            <div className="appointments-page-header">
                <div>
                    <h1>
                        Appointments
                    </h1>
                    <p>
                        Manage provider and patient appointments
                    </p>
                </div>

                {canCreate && (
                    <button
                        className="appointments-create-button"
                        onClick={
                            handleCreate
                        }
                    >
                        + Create Appointment
                    </button>
                )}
            </div>

            {/* =========================================
                ERROR
            ========================================== */}
            {error && (
                <div className="appointments-error">
                    {error}
                </div>
            )}

            {/* =========================================
                TABLE
            ========================================== */}
            <div className="appointments-card">
                {loading ? (
                    <div className="appointments-loading">
                        Loading appointments...
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="appointments-empty">
                        <h3>
                            No appointments found
                        </h3>
                        {canCreate && (
                            <p>
                                Create your first appointment.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="appointments-table-wrapper">
                        <table className="appointments-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Provider</th>
                                    <th>Patient</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                    <th>Reason</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.map(
                                    (
                                        appointment,
                                        index
                                    ) => (
                                        <tr key={ appointment.id}>
                                            <td>{(currentPage - 1) * appointmentsPerPage + index + 1}</td>
                                            <td>
                                                <strong>
                                                    {
                                                        appointment.provider_name
                                                    }
                                                </strong>
                                            </td>
                                            <td>
                                                {
                                                    appointment.patient_name
                                                }
                                            </td>
                                            <td>
                                                {formatDate(
                                                    appointment.appointment_date
                                                )}
                                            </td>
                                            <td>
                                                {
                                                    formatTime(
                                                        appointment.start_time
                                                    )
                                                }
                                                {" - "}
                                                {
                                                    formatTime(
                                                        appointment.end_time
                                                    )
                                                }
                                            </td>
                                            <td>
                                                <span
                                                    className={
                                                        `appointment-status appointment-status-${appointment.status}`
                                                    }
                                                >
                                                    {
                                                        appointment.status
                                                    }
                                                </span>
                                            </td>
                                            <td>
                                                {
                                                    appointment.reason ||
                                                    "-"
                                                }
                                            </td>

                                            {/* =================================
                                                ACTIONS
                                            ================================== */}
                                            <td>
                                                <div className="appointment-actions">

                                                    {/* =================================
                                                        STATUS DROPDOWN
                                                        Patient should NOT see this
                                                    ================================== */}
                                                    {user?.role !== "patient" &&
                                                        canUpdate && (
                                                            <select
                                                                className="appointment-status-select"
                                                                value={appointment.status}
                                                                disabled={
                                                                    updatingStatusId ===
                                                                    appointment.id
                                                                }
                                                                onChange={(event) =>
                                                                    handleStatusChange(
                                                                        appointment,
                                                                        event.target.value
                                                                    )
                                                                }
                                                            >
                                                                <option value="scheduled">
                                                                    Scheduled
                                                                </option>

                                                                <option value="completed">
                                                                    Completed
                                                                </option>

                                                                <option value="cancelled">
                                                                    Cancelled
                                                                </option>

                                                                <option value="rejected">
                                                                    Rejected
                                                                </option>
                                                            </select>
                                                        )}

                                                    {/* =================================
                                                        EDIT
                                                        Patient can see only Edit
                                                    ================================== */}
                                                    {canUpdate &&
                                                        appointment.status !== "completed" && (
                                                            <button
                                                                className="appointment-action-edit"
                                                                onClick={() =>
                                                                    handleEdit(
                                                                        appointment
                                                                    )
                                                                }
                                                            >
                                                                Edit
                                                            </button>
                                                        )}

                                                    {/* =================================
                                                        DELETE
                                                    ================================== */}
                                                    {canDelete &&
                                                        user?.role !== "patient" && (
                                                            <button
                                                                className="appointment-action-delete"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        appointment
                                                                    )
                                                                }
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                        {/* =========================================
                            PAGINATION
                        ========================================== */}

                        {totalPages > 1 && (
                            <div className="appointments-pagination">

                                {/* Previous Button */}
                                <button
                                    type="button"
                                    className="appointments-pagination-button"
                                    disabled={currentPage === 1}
                                    onClick={() =>
                                        handlePageChange(
                                            currentPage - 1
                                        )
                                    }
                                >
                                    Previous
                                </button>

                                {/* Page Numbers */}
                                {Array.from(
                                    { length: totalPages },
                                    (_, index) => index + 1
                                ).map((page) => (
                                    <button
                                        key={page}
                                        type="button"
                                        className={`appointments-pagination-button ${
                                            currentPage === page
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            handlePageChange(page)
                                        }
                                    >
                                        {page}
                                    </button>
                                ))}

                                {/* Next Button */}
                                <button
                                    type="button"
                                    className="appointments-pagination-button"
                                    disabled={
                                        currentPage === totalPages
                                    }
                                    onClick={() =>
                                        handlePageChange(
                                            currentPage + 1
                                        )
                                    }
                                >
                                    Next
                                </button>

                            </div>
                        )}

                        {/* Pagination Information */}
                        <div className="appointments-pagination-info">
                            Showing page {currentPage} of {totalPages}
                            {" "}({totalAppointments} appointments)
                        </div>
                    </div>
                )}
            </div>

            {/* =========================================
                FORM MODAL
            ========================================== */}
            <AppointmentFormModal
                isOpen={
                    showModal
                }
                onClose={() =>
                    setShowModal(
                        false
                    )
                }

                onSuccess={
                    loadData
                }

                appointment={
                    selectedAppointment
                }

                providers={
                    providers
                }

                patients={
                    patients
                }
            />

            {/* =========================================
                    CONFIRMATION MODAL
                ========================================= */}

                {confirmationModal.open && (
                    <div className="appointment-confirmation-overlay">
                        <div className="appointment-confirmation-modal">
                            <div className="appointment-confirmation-icon">
                                {confirmationModal.type === "delete"
                                    ? "🗑️"
                                    : "⚠️"}
                            </div>
                            <h2>
                                {confirmationModal.type === "delete"
                                    ? "Delete Appointment"
                                    : "Update Appointment Status"}
                            </h2>

                            <p>
                                {confirmationModal.type === "delete"
                                    ? "Are you sure you want to delete this appointment?"
                                    : `Are you sure you want to change the appointment status to "${confirmationModal.status}"?`}
                            </p>

                            <span className="appointment-confirmation-warning">
                                {confirmationModal.type === "delete"
                                    ? "This action cannot be undone."
                                    : "Please confirm this status change."}
                            </span>

                            <div className="appointment-confirmation-actions">
                                <button
                                    type="button"
                                    className="appointment-confirmation-cancel"
                                    onClick={
                                        closeConfirmationModal
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className={
                                        confirmationModal.type === "delete"
                                            ? "appointment-confirmation-delete"
                                            : "appointment-confirmation-confirm"
                                    }
                                    onClick={
                                        confirmationModal.type === "delete"
                                            ? confirmDelete
                                            : confirmStatusChange
                                    }
                                    disabled={
                                        confirmationModal.type === "status" &&
                                        updatingStatusId !== null
                                    }
                                >
                                    {confirmationModal.type === "delete"
                                        ? "Delete"
                                        : updatingStatusId !== null
                                            ? "Updating..."
                                            : "Update"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default AppointmentsPage;