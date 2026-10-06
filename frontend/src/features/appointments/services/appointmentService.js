import api from "../../../services/api";

// ==================================================
// GET APPOINTMENTS
// ==================================================
export const getAppointments = async (
    page = 1,
    limit = 10
) => {
    const response = await api.get(
        `/appointments?page=${page}&limit=${limit}`
    );

    return response.data;
};

// ==================================================
// GET APPOINTMENT OPTIONS
// ==================================================
export const getAppointmentOptions = async () => {
    const response =
        await api.get(
            "/appointments/options"
        );

    return response.data;
};

// ==================================================
// GET SINGLE APPOINTMENT
// ==================================================
export const getAppointment = async (
    id
) => {
    const response =
        await api.get(
            `/appointments/${id}`
        );

    return response.data;
};

// ==================================================
// CREATE APPOINTMENT
// ==================================================
export const createAppointment = async (
    appointmentData
) => {
    const response =
        await api.post(
            "/appointments",
            appointmentData
        );

    return response.data;
};


// ==================================================
// UPDATE APPOINTMENT
// ==================================================
export const updateAppointment = async (
    id,
    appointmentData
) => {
    const response =
        await api.put(
            `/appointments/${id}`,
            appointmentData
        );

    return response.data;
};

// ==================================================
// DELETE APPOINTMENT
// ==================================================
export const deleteAppointment = async (
    id
) => {
    const response =
        await api.delete(
            `/appointments/${id}`
        );

    return response.data;
};