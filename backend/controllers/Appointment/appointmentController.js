import * as service from "../../services/Appointment/appointmentService.js";

// Send updates to the rooms for the provider(s) affected by an appointment change.
function emitAppointmentEvent(req, eventName, appointment, previousProviderId = null) {
    const io = req.app.get("io");
    if (!io || !appointment) return;
    const tenantId = req.tenant?.identifier;
    if (!tenantId) return;
    
    const providerIds = new Set([
        Number(appointment.provider_id ?? appointment.providerId),
        previousProviderId == null ? null : Number(previousProviderId),
    ].filter((id) => Number.isInteger(id) && id > 0));
    
    for (const providerId of providerIds) {
        io.to(`tenant_${tenantId}_provider_${providerId}`).emit(eventName, {
            appointmentId: Number(appointment.id),
            providerId,
            patientId: Number(appointment.patient_id ?? appointment.patientId),
            tenantId,
        });
    }
}

export async function create(req, res) {
    try {
        const result = await service.createNew(req.tenantDb, req, req.body);
        emitAppointmentEvent(req, "appointment_created", result.appointment);
        return res.status(201).json({ message: "Appointment created successfully", ...result });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message,
            ...(error.appointmentId ? { appointment_id: error.appointmentId } : {}),
        });
    }
}

export async function list(req, res) {
    try {
        return res.json(await service.getAll(req.tenantDb, req, req.query.page, req.query.limit));
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
}

export async function show(req, res) {
    try {
        return res.json({ appointment: await service.getOne(req.tenantDb, req, req.params.id) });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
}

export async function update(req, res) {
    try {
        // Keep the old provider ID too, in case the appointment is reassigned.
        const previous = await service.getOne(req.tenantDb, req, req.params.id);
        const appointment = await service.updateExisting(req.tenantDb, req, req.params.id, req.body);
        emitAppointmentEvent(req, "appointment_updated", appointment, previous.provider_id);
        return res.json({ message: "Appointment updated successfully", appointment });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
}

export async function destroy(req, res) {
    try {
        const previous = await service.getOne(req.tenantDb, req, req.params.id);
        const result = await service.remove(req.tenantDb, req.params.id);
        emitAppointmentEvent(req, "appointment_deleted", previous);
        return res.json(result);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
}

export async function options(req, res) {
    try {
        return res.json(await service.options(req.tenantDb));
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
}
