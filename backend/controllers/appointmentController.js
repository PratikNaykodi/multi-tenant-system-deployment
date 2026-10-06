// ==================================================
// Appointment Controller
// ==================================================
const VALID_STATUSES = [
    "scheduled",
    "completed",
    "cancelled",
    "rejected"
];

// ==================================================
// CREATE APPOINTMENT
// ==================================================
export const createAppointment = async (req, res) => {
    // Get a database client from the current tenant's connection pool.
    const client = await req.tenantDb.connect();

    try {
        // Get appointment data sent by the frontend.
        const {
            provider_id,
            patient_id,
            appointment_date,
            start_time,
            end_time,
            reason
        } = req.body;


        // ------------------------------------------
        // Validation
        // ------------------------------------------
        // Check that all required appointment fields are provided.
        if (
            !provider_id ||
            !patient_id ||
            !appointment_date ||
            !start_time ||
            !end_time
        ) {
            return res.status(400).json({
                message: "provider_id, patient_id, appointment_date, start_time and end_time are required"
            });
        }

        // prevents invalid appointment time ranges.
        if (end_time <= start_time) {
            return res.status(400).json({
                message: "End time must be greater than start time"
            });
        }

        // Start a database transaction.
        // All database changes will be committed together.
        // If any step fails, we can rollback all changes.
        await client.query("BEGIN");


        // ------------------------------------------
        // IMPORTANT
        //
        // Lock same provider + date.
        //
        // This prevents two users from booking
        // the same provider at the same time.
        // ------------------------------------------

        await client.query(
            `
            SELECT pg_advisory_xact_lock(
                hashtext($1)
            )
            `,
            [
                `${provider_id}:${appointment_date}`
            ]
        );

        // ------------------------------------------
        // Check provider
        // ------------------------------------------
        const providerResult =
            await client.query(
                `
                SELECT
                    p.id,
                    p.user_id,
                    u.name,
                    p.specialization

                FROM providers p

                INNER JOIN users u
                    ON u.id = p.user_id

                WHERE p.id = $1

                FOR UPDATE
                `,
                [provider_id]
            );

        // ------------------------------------------
        // Provider ownership check
        // A provider should only be able to create an appointment for their own provider profile.
        //
        // Admin or other authorized users can create appointments for other providers.
        // ------------------------------------------
        if (
            req.user.role === "provider" &&
            Number(providerResult.rows[0].user_id) !==
                Number(req.user.id)
        ) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                message: "Provider can create appointments only for themselves"
            });
        }

        if ( providerResult.rows.length === 0 ) {

            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Provider not found"
            });

        }

        // ------------------------------------------
        // Check patient
        // ------------------------------------------
        const patientResult =
            await client.query(
                `
                SELECT
                    p.id,
                    p.user_id,
                    u.name

                FROM patients p

                INNER JOIN users u
                    ON u.id = p.user_id

                WHERE p.id = $1

                FOR UPDATE
                `,
                [patient_id]
            );
        
        // Check whether the patient exists.
        if ( patientResult.rows.length === 0 ) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Patient not found"
            });

        }


        // ------------------------------------------
        // Check overlapping appointment
        // ------------------------------------------
        const overlapResult =
            await client.query(
                `
                SELECT
                    id,
                    start_time,
                    end_time
                FROM appointments
                WHERE provider_id = $1
                AND appointment_date = $2
                AND status NOT IN (
                    'cancelled',
                    'rejected'
                )
                AND start_time < $4::time
                AND end_time > $3::time
                LIMIT 1
                FOR UPDATE
                `,
                [
                    provider_id,
                    appointment_date,
                    start_time,
                    end_time
                ]
            );

        if ( overlapResult.rows.length > 0 ) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "This provider is already booked for the selected time slot",

                appointment_id: overlapResult.rows[0].id
            });
        }

        // ------------------------------------------
        // Create appointment
        // ------------------------------------------
        // Insert the appointment into the tenant's database.
        //
        // The status is automatically set to "scheduled" when a new appointment is created.
        const result =
            await client.query(
                `
                INSERT INTO appointments (
                    provider_id,
                    patient_id,
                    appointment_date,
                    start_time,
                    end_time,
                    status,
                    reason
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    'scheduled',
                    $6
                )

                RETURNING
                    id,
                    provider_id,
                    patient_id,
                    appointment_date,
                    start_time,
                    end_time,
                    status,
                    reason,
                    created_at
                `,
                [
                    provider_id,
                    patient_id,
                    appointment_date,
                    start_time,
                    end_time,
                    reason || null
                ]
            );

        await client.query("COMMIT");

        // ==================================================
        // Socket.IO - Notify Provider
        // ==================================================
        // Get the Socket.IO instance that was created in server.js.
        const io = req.app.get("io");

        // Create a private Socket.IO room for this provider
        // inside the current tenant.
        //
        // Example:
        // tenant_bb_provider_2
        //
        // This ensures only the required provider receives the appointment notification.
        const room = `tenant_${req.tenant.identifier}_provider_${provider_id}`;

        // Send a real-time event to the provider's room.
        // The provider frontend listens for "appointment_created" and reloads the appointment list automatically.
        io.to(room).emit(
            "appointment_created",
            {
                appointmentId: result.rows[0].id, // ID of the newly created appointment.

                providerId: Number(provider_id), // ID of the provider for whom the appointment was created.

                patientId: Number(patient_id) // ID of the patient who created/owns the appointment.
            }
        );

        return res.status(201).json({
            message: "Appointment created successfully",

            appointment: result.rows[0],

            provider: providerResult.rows[0],

            patient: patientResult.rows[0]
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error( "Create appointment error:", error );

        return res.status(500).json({
            message: "Error creating appointment",

            error: error.message
        });

    } finally {
        client.release();
    }
};

// ==================================================
// GET ALL APPOINTMENTS
// ==================================================

// ==================================================
// GET ALL APPOINTMENTS
// ==================================================
//
// Admin / Manager:
//     Can see all appointments.
//
// Provider:
//     Can see only their own appointments.
//
// Patient:
//     Can see only their own appointments.
//
// Pagination:
//     page  = current page number
//     limit = number of appointments per page
//
// ==================================================

export const getAppointments = async (req, res) => {
    try {
        // ------------------------------------------
        // Pagination
        // ------------------------------------------

        // Get the requested page number.
        //
        // Example:
        // /api/appointments?page=2
        //
        // If page is not provided, use page 1.
        const page = Math.max(
            Number(req.query.page) || 1,
            1
        );

        // Get the number of appointments per page.
        //
        // Default = 10
        // Maximum = 100
        const limit = Math.min(
            Number(req.query.limit) || 10,
            100
        );

        // Calculate how many records should be skipped.
        //
        // Page 1 -> 0
        // Page 2 -> 10
        // Page 3 -> 20
        const offset = (page - 1) * limit;

        // ------------------------------------------
        // Get Current User Role
        // ------------------------------------------

        // Get the logged-in user's role name.
        //
        // We need this because Provider and Patient
        // have restricted appointment visibility.
        const userRoleResult =
            await req.tenantDb.query(
                `
                SELECT name
                FROM roles
                WHERE id = $1
                `,
                [req.user.role_id]
            );

        const currentUserRole =
            userRoleResult.rows[0]?.name;

        // ------------------------------------------
        // Base Appointment Query
        // ------------------------------------------

        // Get appointment information along with
        // provider and patient names.
        let query = `
            SELECT
                a.id,
                a.provider_id,
                a.patient_id,
                a.appointment_date,
                a.start_time,
                a.end_time,
                a.status,
                a.reason,
                a.created_at,

                provider_user.name
                    AS provider_name,

                patient_user.name
                    AS patient_name

            FROM appointments a

            INNER JOIN providers p
                ON p.id = a.provider_id

            INNER JOIN users provider_user
                ON provider_user.id = p.user_id

            INNER JOIN patients pt
                ON pt.id = a.patient_id

            INNER JOIN users patient_user
                ON patient_user.id = pt.user_id
        `;

        // Parameters used by the appointment query.
        const params = [];

        // ------------------------------------------
        // Provider Access Restriction
        // ------------------------------------------

        // Provider can only see appointments
        // belonging to their own provider profile.
        if (currentUserRole === "provider") {
            query += `
                WHERE p.user_id = $1
            `;

            params.push(req.user.id);
        }

        // ------------------------------------------
        // Patient Access Restriction
        // ------------------------------------------

        // Patient can only see appointments
        // belonging to their own patient profile.
        if (currentUserRole === "patient") {
            query += `
                WHERE pt.user_id = $1
            `;

            params.push(req.user.id);
        }

        // ------------------------------------------
        // Count Total Appointments
        // ------------------------------------------

        // We need the total number of appointments
        // to calculate the number of available pages.
        let countQuery = `
            SELECT COUNT(*) AS total

            FROM appointments a

            INNER JOIN providers p
                ON p.id = a.provider_id

            INNER JOIN patients pt
                ON pt.id = a.patient_id
        `;

        // Parameters used by the count query.
        const countParams = [];

        // Apply the same Provider restriction
        // to the count query.
        if (currentUserRole === "provider") {
            countQuery += `
                WHERE p.user_id = $1
            `;

            countParams.push(req.user.id);
        }

        // Apply the same Patient restriction
        // to the count query.
        if (currentUserRole === "patient") {
            countQuery += `
                WHERE pt.user_id = $1
            `;

            countParams.push(req.user.id);
        }

        // Execute the count query.
        const countResult =
            await req.tenantDb.query(
                countQuery,
                countParams
            );

        // PostgreSQL returns COUNT as a string,
        // so convert it into a JavaScript number.
        const totalAppointments =
            Number(countResult.rows[0].total);

        // ------------------------------------------
        // Sorting + Pagination
        // ------------------------------------------

        // Show the newest appointment dates first.
        //
        // LIMIT:
        //     Number of appointments to return.
        //
        // OFFSET:
        //     Number of appointments to skip.
        query += `
            ORDER BY
                a.appointment_date DESC,
                a.start_time DESC

            LIMIT $${params.length + 1}
            OFFSET $${params.length + 2}
        `;

        // Add pagination values after existing
        // role-specific parameters.
        params.push(
            limit,
            offset
        );

        // ------------------------------------------
        // Execute Appointment Query
        // ------------------------------------------

        const result =
            await req.tenantDb.query(
                query,
                params
            );

        // ------------------------------------------
        // Calculate Total Pages
        // ------------------------------------------

        // Example:
        //
        // Total appointments = 25
        // Limit = 10
        //
        // Total pages = 3
        const totalPages =
            Math.ceil(
                totalAppointments / limit
            );

        // ------------------------------------------
        // Response
        // ------------------------------------------
        return res.json({
            appointments: result.rows,
            pagination: {
                page,
                limit,
                total: totalAppointments,
                totalPages
            }
        });
    } catch (error) {
        // Log the error for backend debugging.
        console.error( "Get appointments error:", error);

        return res.status(500).json({
            message: "Error getting appointments",

            error: error.message
        });
    }
};

// ==================================================
// GET SINGLE APPOINTMENT
// ==================================================

export const getAppointment = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        let query = `
            SELECT
                a.id,

                a.provider_id,

                a.patient_id,

                a.appointment_date,

                a.start_time,

                a.end_time,

                a.status,

                a.reason,

                a.created_at,

                provider_user.name
                    AS provider_name,

                patient_user.name
                    AS patient_name

            FROM appointments a

            INNER JOIN providers p
                ON p.id = a.provider_id

            INNER JOIN users provider_user
                ON provider_user.id = p.user_id

            INNER JOIN patients pt
                ON pt.id = a.patient_id

            INNER JOIN users patient_user
                ON patient_user.id = pt.user_id

            WHERE a.id = $1
        `;
        const params = [id];

        // ------------------------------------------
        // Provider can only access own appointment
        // ------------------------------------------
        if ( req.user.role === "provider" ) {
            query += `
                AND p.user_id = $2
            `;
            params.push(
                req.user.id
            );

        }

        const result = await req.tenantDb.query(
                query,
                params
            );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        return res.json({
            appointment: result.rows[0]
        });
    } catch (error) {
        console.error( "Get appointment error:", error );

        return res.status(500).json({
            message: "Error getting appointment",

            error: error.message
        });
    }
};

// ==================================================
// UPDATE APPOINTMENT
// ==================================================
export const updateAppointment = async (
    req,
    res
) => {
    const client = await req.tenantDb.connect();
    try {
        const { id } = req.params;

        const {
            provider_id,
            patient_id,
            appointment_date,
            start_time,
            end_time,
            reason,
            status
        } = req.body;

        await client.query("BEGIN");

        // ------------------------------------------
        // Get appointment
        // ------------------------------------------
        const appointmentResult = await client.query(
                `
                SELECT
                    a.*,
                    p.user_id AS provider_user_id

                FROM appointments a

                INNER JOIN providers p
                    ON p.id = a.provider_id

                WHERE a.id = $1

                FOR UPDATE
                `,
                [id]
            );

        if ( appointmentResult.rows.length === 0 ) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        const existing = appointmentResult.rows[0];

        // ------------------------------------------
        // Provider ownership check
        // ------------------------------------------
        if (
            req.user.role === "provider" &&
            existing.provider_user_id !==
                req.user.userId
        ) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                message: "You can only update your own appointments"
            });
        }

        // ------------------------------------------
        // Status validation
        // ------------------------------------------
        if ( status && !VALID_STATUSES.includes(status) ) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Invalid appointment status"
            });
        }

        // ------------------------------------------
        // Provider can update status/reason/time
        // but cannot move appointment to another
        // provider/patient.
        // ------------------------------------------
        let finalProviderId = provider_id || existing.provider_id;

        let finalPatientId = patient_id || existing.patient_id;

        let finalDate = appointment_date || existing.appointment_date;

        let finalStartTime = start_time || existing.start_time;

        let finalEndTime = end_time || existing.end_time;

        let finalReason = reason !== undefined ? reason : existing.reason;

        let finalStatus = status || existing.status;

        if (finalEndTime <= finalStartTime ) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "End time must be greater than start time"
            });
        }

        // ------------------------------------------
        // Provider cannot change provider/patient
        // ------------------------------------------
        if ( req.user.role === "provider" ) {
            finalProviderId = existing.provider_id;
            finalPatientId = existing.patient_id;
        }

        // ------------------------------------------
        // Lock provider/date
        // ------------------------------------------
        await client.query(
            `
            SELECT pg_advisory_xact_lock(
                hashtext($1)
            )
            `,
            [
                `${finalProviderId}:${finalDate}`
            ]
        );

        // ------------------------------------------
        // Check overlapping appointment
        // ------------------------------------------
        const overlapResult =
            await client.query(
                `
                SELECT
                    id

                FROM appointments

                WHERE provider_id = $1

                AND appointment_date = $2

                AND id != $5

                AND status NOT IN (
                    'cancelled',
                    'rejected'
                )

                AND start_time < $4::time

                AND end_time > $3::time

                LIMIT 1

                FOR UPDATE
                `,
                [
                    finalProviderId,
                    finalDate,
                    finalStartTime,
                    finalEndTime,
                    id
                ]
            );

        if ( overlapResult.rows.length > 0 ) {

            await client.query("ROLLBACK");
            return res.status(409).json({
                message: "This provider is already booked for the selected time slot",

                appointment_id: overlapResult.rows[0].id
            });
        }

        // ------------------------------------------
        // Update appointment
        // ------------------------------------------
        const result =
            await client.query(
                `
                UPDATE appointments

                SET
                    provider_id = $1,
                    patient_id = $2,
                    appointment_date = $3,
                    start_time = $4,
                    end_time = $5,
                    reason = $6,
                    status = $7

                WHERE id = $8

                RETURNING
                    id,
                    provider_id,
                    patient_id,
                    appointment_date,
                    start_time,
                    end_time,
                    status,
                    reason,
                    created_at
                `,
                [
                    finalProviderId,
                    finalPatientId,
                    finalDate,
                    finalStartTime,
                    finalEndTime,
                    finalReason,
                    finalStatus,
                    id
                ]
            );

        await client.query("COMMIT");

        return res.json({
            message: "Appointment updated successfully",

            appointment: result.rows[0]

        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error( "Update appointment error:", error );

        return res.status(500).json({
            message: "Error updating appointment",

            error: error.message
        });
    } finally {
        client.release();
    }
};

// ==================================================
// DELETE APPOINTMENT
// ==================================================

export const deleteAppointment = async (
    req,
    res
) => {
    try {

        const { id } = req.params;

        const result = await req.tenantDb.query(
                `
                DELETE FROM appointments

                WHERE id = $1

                RETURNING id
                `,
                [id]
            );

        if ( result.rows.length === 0 ) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        return res.json({
            message: "Appointment deleted successfully"
        });

    } catch (error) {
        console.error("Delete appointment error:", error );

        return res.status(500).json({
            message: "Error deleting appointment",
            error: error.message
        });
    }
};

// ==================================================
// GET APPOINTMENT OPTIONS
// ==================================================
//
// Used by Appointment form.
//
// Returns:
//
// providers
// patients
//
// Provider does NOT need user.read permission.
//
// ==================================================
export const getAppointmentOptions = async (
    req,
    res
) => {

    try {
        // ------------------------------------------
        // Get providers
        // ------------------------------------------
        const providerResult = await req.tenantDb.query(
            `
            SELECT
                p.id AS provider_id,
                p.user_id,
                u.name,
                u.email,
                p.specialization,
                p.experience_years

            FROM providers p

            INNER JOIN users u
                ON u.id = p.user_id

            INNER JOIN roles r
                ON r.id = u.role_id

            WHERE r.name = 'provider'

            ORDER BY u.name
            `
        );

        // ------------------------------------------
        // Get patients
        // ------------------------------------------
            const userRoleResult =
            await req.tenantDb.query(
                `
                SELECT name
                FROM roles
                WHERE id = $1
                `,
                [req.user.role_id]
            );

        const currentUserRole = userRoleResult.rows[0]?.name;
        const patientResult = await req.tenantDb.query(
                `
                SELECT
                    p.id AS patient_id,
                    p.user_id,
                    u.name,
                    u.email

                FROM patients p

                INNER JOIN users u
                    ON u.id = p.user_id

                INNER JOIN roles r
                    ON r.id = u.role_id

                WHERE r.name = 'patient'
                ${
                    currentUserRole === "patient"
                        ? "AND p.user_id = $1"
                        : ""
                }
                ORDER BY u.name
                `,
                currentUserRole === "patient"
            ? [req.user.id]
            : []
            );

        return res.json({
            providers: providerResult.rows,
            patients: patientResult.rows
        });
    } catch (error) {
        console.error( "Get appointment options error:", error );

        return res.status(500).json({
            message: "Error getting appointment options",
            error: error.message
        });
    }
};