import * as repo from "../../repositories/Appointment/appointmentRepository.js";

const statuses = ["scheduled", "completed", "cancelled", "rejected"];

const asDate = (v) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime()))
        throw Object.assign(new Error("Invalid appointment_date"), {
        statusCode: 400,
    });
    return d;
};

const output = (a) => ({
        id: a.id,
        provider_id: a.providerId,
        patient_id: a.patientId,
        appointment_date: a.appointmentDate.toISOString().slice(0, 10),
        start_time: a.startTime,
        end_time: a.endTime,
        status: a.status,
        reason: a.reason,
        created_at: a.createdAt,
        provider_name: a.provider?.user?.name || null,
        patient_name: a.patient?.user?.name || null,
    });

function scope(req) {
    const id = Number(req.user.userId || req.user.id);
    if (req.user.role === "provider") return { provider: { userId: id } };
    if (req.user.role === "patient") return { patient: { userId: id } };
    return {};
}

export async function getAll(db, req, page = 1, limit = 10) {
    page = Math.max(Number(page) || 1, 1);

    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const where = scope(req);

    const [rows, total] = await Promise.all([
        repo.listAppointments(db, where, (page - 1) * limit, limit),
        repo.countAppointments(db, where),
    ]);

    return {
        appointments: rows.map(output),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
}
export async function getOne(db, req, id) {
    const a = await repo.findAppointmentById(db, id);
    if (!a)
        throw Object.assign(new Error("Appointment not found"), {
        statusCode: 404,
    });

    const s = scope(req);
    
    if (
        Object.keys(s).length &&
        !(await db.appointment.findFirst({ where: { id: Number(id), ...s } }))
    )
    throw Object.assign(new Error("Appointment not found"), {
        statusCode: 404,
    });
    return output(a);
}

export async function createNew(db, req, input) {
    const {
        provider_id,
        patient_id,
        appointment_date,
        start_time,
        end_time,
        reason,
    } = input;

    if (
        !provider_id ||
        !patient_id ||
        !appointment_date ||
        !start_time ||
        !end_time
    )
        throw Object.assign(
            new Error(
                "provider_id, patient_id, appointment_date, start_time and end_time are required",
            ),
            { statusCode: 400 },
        );

    if (end_time <= start_time)
        throw Object.assign(new Error("End time must be greater than start time"), {
            statusCode: 400,
        });

    const p = await repo.findProviderById(db, provider_id);

    if (!p)
        throw Object.assign(new Error("Provider not found"), { statusCode: 404 });

    const pt = await repo.findPatientById(db, patient_id);
    if (!pt)
        throw Object.assign(new Error("Patient not found"), { statusCode: 404 });

    if (
        req.user.role === "provider" &&
        Number(p.userId) !== Number(req.user.userId || req.user.id)
    )
        throw Object.assign(
            new Error("Provider can create appointments only for themselves"),
            { statusCode: 403 },
        );

    if (
        req.user.role === "patient" &&
        Number(pt.userId) !== Number(req.user.userId || req.user.id)
    )
        throw Object.assign(
            new Error("Patients can create appointments only for themselves"),
            { statusCode: 403 },
        );

    const date = asDate(appointment_date);
    const a = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${provider_id}:${appointment_date}`}))`;
        const overlap = await repo.findOverlap(
            tx,
            provider_id,
            date,
            start_time,
            end_time,
        );

        if (overlap)
            throw Object.assign(
            new Error("This provider is already booked for the selected time slot"),
            { statusCode: 409, appointmentId: overlap.id },
        );

        return repo.createAppointment(tx, {
            providerId: Number(provider_id),
            patientId: Number(patient_id),
            appointmentDate: date,
            startTime: start_time,
            endTime: end_time,
            status: "scheduled",
            reason: reason || null,
        });
    });
    return {
        appointment: output(a),
        provider: {
            provider_id: p.id,
            user_id: p.userId,
            name: p.user.name,
            email: p.user.email,
            specialization: p.specialization,
            experience_years: p.experienceYears,
        },
        patient: {
            patient_id: pt.id,
            user_id: pt.userId,
            name: pt.user.name,
            email: pt.user.email,
        },
    };
}

export async function updateExisting(db, req, id, input) {
    const old = await repo.findAppointmentById(db, id);

    if (!old)
        throw Object.assign(new Error("Appointment not found"), {
            statusCode: 404,
        });

    const uid = Number(req.user.userId || req.user.id);

    if (req.user.role === "provider" && old.provider.userId !== uid)
        throw Object.assign(new Error("You can update only your appointments"), {
            statusCode: 403,
        });
    if (req.user.role === "patient" && old.patient.userId !== uid)
        throw Object.assign(new Error("You can update only your appointments"), {
            statusCode: 403,
        });

    const data = {};

    if (input.provider_id !== undefined)
        data.providerId = Number(input.provider_id);

    if (input.patient_id !== undefined) data.patientId = Number(input.patient_id);

    if (input.appointment_date !== undefined)
        data.appointmentDate = asDate(input.appointment_date);

    if (input.start_time !== undefined) data.startTime = input.start_time;

    if (input.end_time !== undefined) data.endTime = input.end_time;

    if (input.reason !== undefined) data.reason = input.reason;

    if (input.status !== undefined) {
        if (!statuses.includes(input.status))
            throw Object.assign(new Error("Invalid appointment status"), {
            statusCode: 400,
        });
        data.status = input.status;
    }

    const fp = data.providerId ?? old.providerId,
    fpt = data.patientId ?? old.patientId,
    fd = data.appointmentDate ?? old.appointmentDate,
    fs = data.startTime ?? old.startTime,
    fe = data.endTime ?? old.endTime;

    if (fe <= fs)
        throw Object.assign(new Error("End time must be greater than start time"), {
            statusCode: 400,
        });

    if (req.user.role === "provider" && fp !== old.providerId)
        throw Object.assign(
        new Error("Provider cannot move the appointment to another provider"),
            { statusCode: 403 },
        );
        
    if (req.user.role === "patient" && fpt !== old.patientId)
        throw Object.assign(
        new Error("Patient cannot move the appointment to another patient"),
            { statusCode: 403 },
        );

    const a = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${fp}:${fd.toISOString().slice(0, 10)}`}))`;
        const overlap = await repo.findOverlap(tx, fp, fd, fs, fe, id);
        if (overlap)
            throw Object.assign(
            new Error("This provider is already booked for the selected time slot"),
            { statusCode: 409 },
        );
        return repo.updateAppointment(tx, id, data);
    });
    return output(a);
}

export async function remove(db, id) {
    if (!(await repo.findAppointmentById(db, id)))
        throw Object.assign(new Error("Appointment not found"), {
        statusCode: 404,
    });
    await repo.deleteAppointment(db, id);
    return { message: "Appointment deleted successfully" };
}

export async function options(db) {
    const [ps, pts] = await Promise.all([
        repo.listProviders(db),
        repo.listPatients(db),
    ]);
    return {
        providers: ps.map((p) => ({
            provider_id: p.id,
            user_id: p.userId,
            name: p.user.name,
            email: p.user.email,
            specialization: p.specialization,
            experience_years: p.experienceYears,
        })),
        patients: pts.map((p) => ({
            patient_id: p.id,
            user_id: p.userId,
            name: p.user.name,
            email: p.user.email,
        })),
    };
}
