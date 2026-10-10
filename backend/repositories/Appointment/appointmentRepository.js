const include = {
    provider: { include: { user: true } },
    patient: { include: { user: true } },
};

export const createAppointment = (db, data) =>
    db.appointment.create({ data, include });

export const findAppointmentById = (db, id) =>
    db.appointment.findUnique({ where: { id: Number(id) }, include });

export const listAppointments = (db, where, skip, take) =>
    db.appointment.findMany({
        where,
        skip,
        take,
        orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
        include,
    });

export const countAppointments = (db, where) => db.appointment.count({ where });

export const findOverlap = (
    db,
    providerId,
    date,
    startTime,
    endTime,
    excludeId,
) =>
    db.appointment.findFirst({
        where: {
            providerId: Number(providerId),
            appointmentDate: date,
            status: { notIn: ["cancelled", "rejected"] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
            ...(excludeId ? { id: { not: Number(excludeId) } } : {}),
        },
    });

export const updateAppointment = (db, id, data) =>
    db.appointment.update({ where: { id: Number(id) }, data, include });

export const deleteAppointment = (db, id) =>
    db.appointment.delete({ where: { id: Number(id) } });

export const findProviderById = (db, id) =>
    db.provider.findUnique({
        where: { id: Number(id) },
        include: { user: true },
    });

export const findPatientById = (db, id) =>
    db.patient.findUnique({ where: { id: Number(id) }, include: { user: true } });

export const listProviders = (db) =>
    db.provider.findMany({
        orderBy: { user: { name: "asc" } },
        include: { user: true },
    });
    
export const listPatients = (db) =>
    db.patient.findMany({
        orderBy: { user: { name: "asc" } },
        include: { user: true },
    });
