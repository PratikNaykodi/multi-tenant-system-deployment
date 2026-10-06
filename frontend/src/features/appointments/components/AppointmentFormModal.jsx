import { useEffect, useState } from "react";
import { createAppointment, updateAppointment } from "../services/appointmentService";
import { useAuth } from "../../../context/AuthContext";
import "./AppointmentFormModal.css";
import { toast } from "react-toastify";

const AppointmentFormModal = ({
    isOpen,
    onClose,
    onSuccess,
    appointment,
    providers,
    patients
}) => {
    const { user } = useAuth();

    const isEditMode = Boolean(appointment);

    const [formData, setFormData] = useState({
                                    provider_id: "",
                                    patient_id: "",
                                    appointment_date: "",
                                    start_time: "",
                                    end_time: "",
                                    reason: ""
                                });

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    // ==================================================
    // Find logged-in provider
    // ==================================================
    const getLoggedInProviderId = () => {
        if ( user?.role !== "provider" ) {
            return "";
        }

        const currentProvider = providers.find(
                                    provider =>
                                        Number(provider.user_id) === Number(user.id)
                                );
        return (
            currentProvider?.provider_id || ""
        );
    };


    // ==================================================
    // Populate form
    // ==================================================
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (appointment) {
            setFormData({
                provider_id: appointment.provider_id || "",
                patient_id: appointment.patient_id || "",
                appointment_date: appointment.appointment_date ? appointment.appointment_date.substring(0,10) : "",
                start_time: appointment.start_time ? appointment.start_time.substring(0, 5) : "",
                end_time: appointment.end_time ? appointment.end_time.substring(0,5) : "",
                reason: appointment.reason || ""
            });
        } else {
            const defaultProviderId = getLoggedInProviderId();

            setFormData({
                provider_id: defaultProviderId,
                patient_id: "",
                appointment_date: "",
                start_time: "",
                end_time: "",
                reason: ""
            });
        }

        setError("");

    }, [
        appointment,
        isOpen,
        providers,
        user
    ]);


    if (!isOpen) {
        return null;
    }

    // ==================================================
    // Change
    // ==================================================
    const handleChange = (
        event
    ) => {

        const {
            name,
            value
        } = event.target;

        setFormData(
            previous => ({
                ...previous,
                [name]: value
            })
        );
    };

    // ==================================================
    // Validation
    // ==================================================
    const validateForm = () => {
        if (!formData.provider_id) {
            return "Please select provider";
        }

        if (!formData.patient_id) {
            return "Please select patient";
        }

        if (!formData.appointment_date) {
            return "Please select appointment date";
        }

        if (!formData.start_time) {
            return "Please select start time";
        }

        if (!formData.end_time) {
            return "Please select end time";
        }

        if (
            formData.end_time <=
            formData.start_time
        ) {
            return (
                "End time must be greater than start time"
            );
        }

        return "";
    };

    // ==================================================
    // Submit
    // ==================================================
    const handleSubmit = async (
        event
    ) => {
        event.preventDefault();

        setError("");

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);

            return;
        }

        try {
            setLoading(true);

            const payload = {
                provider_id: Number(formData.provider_id),
                patient_id: Number(formData.patient_id),
                appointment_date: formData.appointment_date,
                start_time: formData.start_time,
                end_time: formData.end_time,
                reason: formData.reason.trim()
            };

            if (isEditMode) {
                await updateAppointment(appointment.id, payload);
                toast.success("Appointment updated successfully!");
            } else {
                await createAppointment(payload);
                toast.success("Appointment created successfully!");
            }

            await onSuccess();

            onClose();

        } catch (error) {
            toast.error(
                error.message || "Failed to save appointment"
            );
            setError(
                error.response?.data?.message ||
                "Unable to save appointment"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="appointment-modal-overlay">
            <div className="appointment-modal">
                {/* ======================================
                    HEADER
                ======================================= */}
                <div className="appointment-modal-header">
                    <h2>
                        {isEditMode
                            ? "Edit Appointment"
                            : "Create Appointment"}
                    </h2>

                    <button type="button" className="appointment-close-button" onClick={onClose}>
                        ×
                    </button>
                </div>

                <form className="appointment-form" onSubmit={handleSubmit}>
                    {/* ==================================
                        BODY
                    =================================== */}
                    <div className="appointment-modal-body">
                        {error && (
                            <div className="appointment-error">
                                {error}
                            </div>
                        )}

                        {/* =================================
                            PROVIDER
                        ================================== */}
                        <div className="appointment-form-group">
                            <label>Provider</label>

                            <select
                                name="provider_id"
                                value={formData.provider_id}
                                onChange={handleChange}
                                disabled={user?.role === "provider"}
                            >
                                <option value="">
                                    Select Provider
                                </option>
                                {providers.map(
                                    provider => (
                                        <option
                                            key={provider.provider_id}
                                            value={provider.provider_id}
                                        >
                                            {provider.name}
                                            {provider.specialization
                                                ? ` - ${provider.specialization}`
                                                : ""}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        {/* =================================
                            PATIENT
                        ================================== */}
                        <div className="appointment-form-group">
                            <label>Patient</label>

                            <select
                                name="patient_id"
                                value={formData.patient_id}
                                onChange={handleChange}
                            >
                                <option value="">
                                    Select Patient
                                </option>
                                {patients.map(
                                    patient => (
                                        <option
                                            key={patient.patient_id}
                                            value={patient.patient_id}
                                        >
                                            {patient.name}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        {/* =================================
                            DATE + TIME
                        ================================== */}
                        <div className="appointment-form-row">
                            <div className="appointment-form-group">
                                <label>Appointment Date</label>
                                <input
                                    type="date"
                                    name="appointment_date"
                                    value={
                                        formData.appointment_date
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />
                            </div>

                            <div className="appointment-form-group">
                                <label>Start Time</label>
                                <input
                                    type="time"
                                    name="start_time"
                                    value={
                                        formData.start_time
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />
                            </div>

                            <div className="appointment-form-group">
                                <label>End Time</label>
                                <input
                                    type="time"
                                    name="end_time"
                                    value={
                                        formData.end_time
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />
                            </div>
                        </div>

                        {/* =================================
                            REASON
                        ================================== */}
                        <div className="appointment-form-group">
                            <label>Reason</label>
                            <textarea
                                name="reason"
                                rows="4"
                                value={
                                    formData.reason
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Enter appointment reason"
                            />
                        </div>
                    </div>

                    {/* ==================================
                        FOOTER
                    =================================== */}
                    <div className="appointment-modal-footer">
                        <button
                            type="button"
                            className="appointment-button appointment-button-secondary"
                            onClick={
                                onClose
                            }
                            disabled={
                                loading
                            }
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="appointment-button appointment-button-primary"
                            disabled={
                                loading
                            }
                        >
                            {loading
                                ? "Saving..."
                                : isEditMode
                                    ? "Update Appointment"
                                    : "Create Appointment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppointmentFormModal;