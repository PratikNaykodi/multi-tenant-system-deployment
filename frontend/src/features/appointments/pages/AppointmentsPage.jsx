import { useEffect, useRef, useState } from "react";
import { appointmentsApi } from "../../../services/crud.js";
import { connectSocket } from "../../../services/socket.js";
import { getApiError, getApiFieldErrors } from "../../../utils/errors.js";
import { validateAppointmentForm } from "../../../utils/validation.js";
import { notify } from "../../../utils/notify.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import PageHeader from "../../../components/PageHeader.jsx";
import { getTenantIdentifier } from "../../../utils/tenant.js";

const makeBlank = () => ({
	provider_id: "",
	patient_id: "",
	appointment_date: "",
	start_time: "",
	end_time: "",
	status: "scheduled",
	reason: "",
});

function getPayloadData(response) {
	return response?.data?.data || response?.data || {};
}

function getDate(value) {
	if (!value) return "";
	const text = String(value);
	return text.includes("T") ? text.slice(0, 10) : text.slice(0, 10);
}

function normaliseAppointment(item) {
	return {
		...makeBlank(),
		...item,
		provider_id: item?.provider_id ?? item?.providerId ?? item?.provider?.id ?? "",
		patient_id: item?.patient_id ?? item?.patientId ?? item?.patient?.id ?? "",
		appointment_date: getDate(item?.appointment_date ?? item?.appointmentDate),
		start_time: item?.start_time ?? item?.startTime ?? "",
		end_time: item?.end_time ?? item?.endTime ?? "",
		status: item?.status || "scheduled",
		reason: item?.reason || "",
	};
}

function roleNameOf(user) {
	const role = user?.role;
	return String(typeof role === "object" ? role?.name : role || user?.role_name || "").toLowerCase();
}

function profileIdOf(user, type, options) {
	// Prefer a profile ID returned by /auth/me; fall back to the options API relation.
	const direct = type === "provider"
	? (user?.provider?.id ?? user?.provider_id ?? user?.providerId)
	: (user?.patient?.id ?? user?.patient_id ?? user?.patientId);
	if (direct != null && direct !== "") return Number(direct);
	const list = type === "provider" ? options.providers : options.patients;
	const match = list.find((profile) => Number(profile.user_id ?? profile.userId ?? profile.user?.id) === Number(user?.id ?? user?.userId));
	const profileId = type === "provider"
	? (match?.provider_id ?? match?.providerId ?? match?.id)
	: (match?.patient_id ?? match?.patientId ?? match?.id);
	return profileId == null ? "" : Number(profileId);
}

function appointmentProfileId(item, type) {
	return type === "provider"
	? Number(item?.provider_id ?? item?.providerId ?? item?.provider?.id)
	: Number(item?.patient_id ?? item?.patientId ?? item?.patient?.id);
}

export default function AppointmentsPage() {
	const { user, hasPermission } = useAuth();
	const [data, setData] = useState([]);
	const [options, setOptions] = useState({ providers: [], patients: [] });
	const optionsRef = useRef({ providers: [], patients: [] });
	const pageRef = useRef(1);
	const roleName = roleNameOf(user);
	const isProvider = roleName === "provider";
	const isPatient = roleName === "patient";
	const ownProviderId = profileIdOf(user, "provider", options);
	const ownPatientId = profileIdOf(user, "patient", options);
	const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
	const [form, setForm] = useState(makeBlank());
	const [editing, setEditing] = useState(null);
	const [show, setShow] = useState(false);
	const [formErrors, setFormErrors] = useState({});
	const [serverError, setServerError] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	
	async function load(page = 1) {
		pageRef.current = page;
		setLoading(true);
		try {
			const response = await appointmentsApi.list(page, 10);
			const payload = getPayloadData(response);
			setData(payload.appointments || []);
			setPagination(payload.pagination || { page, limit: 10, total: payload.appointments?.length || 0, totalPages: 1 });
		} catch (error) {
			notify.error(getApiError(error));
		} finally {
			setLoading(false);
		}
	}
	
	async function loadOptions() {
		try {
			const response = await appointmentsApi.options();
			const payload = getPayloadData(response);
			// The API returns provider_id/patient_id (not always id). Normalize IDs so
			// dropdowns submit the actual profile IDs expected by the appointment API.
			const nextOptions = {
				providers: (payload.providers || []).map((item) => ({
					...item,
					id: item.provider_id ?? item.providerId ?? item.id,
					name: item.name || item.user?.name || item.email || `Provider ${item.provider_id ?? item.id ?? ""}`,
				})),
				patients: (payload.patients || []).map((item) => ({
					...item,
					id: item.patient_id ?? item.patientId ?? item.id,
					name: item.name || item.user?.name || item.email || `Patient ${item.patient_id ?? item.id ?? ""}`,
				})),
			};
			optionsRef.current = nextOptions;
			setOptions(nextOptions);
			// Join each provider's tenant-specific room. Socket updates are emitted to
			// the selected provider's room so every user viewing that provider's list refreshes.
			const socket = connectSocket();
			const tenantId = getTenantIdentifier();
			if (tenantId) nextOptions.providers.forEach((provider) => {
				if (provider.id) socket.emit("join_provider_room", { tenantId, providerId: Number(provider.id) });
			});
			return nextOptions;
		} catch (error) {
			notify.error(`Unable to load provider/patient options. ${getApiError(error)}`);
			return { providers: [], patients: [] };
		}
	}
	
	useEffect(() => {
		load();
		loadOptions();
		
		const socket = connectSocket();
		const joinRooms = () => {
			const tenantId = getTenantIdentifier();
			if (!tenantId) return;
			optionsRef.current.providers.forEach((provider) => {
				if (provider.id) socket.emit("join_provider_room", { tenantId, providerId: Number(provider.id) });
			});
		};
		const refresh = () => {
			// The backend scopes provider/patient data. Refresh after any appointment event
			// delivered to a provider room this client joined.
			load(pageRef.current || 1);
		};
		socket.on("connect", joinRooms); // Rejoin rooms after a Socket.IO reconnect.
		socket.on("appointment_created", refresh);
		socket.on("appointment_updated", refresh);
		socket.on("appointment_deleted", refresh);
		joinRooms();
		return () => {
			socket.off("connect", joinRooms);
			socket.off("appointment_created", refresh);
			socket.off("appointment_updated", refresh);
			socket.off("appointment_deleted", refresh);
		};
		// pagination.page is intentionally not a dependency because this listener is only registered once.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isProvider, ownProviderId]);
	
	async function open(item = null) {
		setServerError("");
		setFormErrors({});
		setEditing(item);
		// Load dropdown options first so we can resolve this user's provider/patient profile ID.
		const latestOptions = await loadOptions();
		const providerId = profileIdOf(user, "provider", latestOptions);
		const patientId = profileIdOf(user, "patient", latestOptions);
		const initial = item ? normaliseAppointment(item) : makeBlank();
		if (isProvider) initial.provider_id = providerId || "";
		if (isPatient) initial.patient_id = patientId || "";
		// Force the signed-in user's own profile on edit too; never trust an editable ID.
		if (item && isProvider) initial.provider_id = providerId || initial.provider_id;
		if (item && isPatient) initial.patient_id = patientId || initial.patient_id;
		setForm(initial);
		setShow(true);
	}
	
	function setValue(name, value) {
		setForm((current) => ({ ...current, [name]: value }));
		setFormErrors((current) => ({ ...current, [name]: "" }));
		setServerError("");
	}
	
	async function save(event) {
		event.preventDefault();
		setServerError("");
		
		// Enforce role-specific IDs in the submitted payload even if a UI field is tampered with.
		const providerId = isProvider ? ownProviderId : form.provider_id;
		const patientId = isPatient ? ownPatientId : form.patient_id;
		const formToValidate = { ...form, provider_id: providerId, patient_id: patientId };
		const validation = validateAppointmentForm(formToValidate);
		setFormErrors(validation);
		if (Object.keys(validation).length) return;
		
		const payload = {
			provider_id: Number(providerId),
			patient_id: Number(patientId),
			appointment_date: form.appointment_date,
			start_time: form.start_time,
			end_time: form.end_time,
			status: form.status || "scheduled",
			reason: String(form.reason || "").trim(),
		};
		
		setSaving(true);
		try {
			if (editing) await appointmentsApi.update(editing.id, payload);
			else await appointmentsApi.create(payload);
			
			setShow(false);
			await load(editing ? pagination.page : 1);
			notify.success(editing ? "Appointment updated successfully" : "Appointment created successfully");
		} catch (error) {
			const fieldErrors = getApiFieldErrors(error);
			setFormErrors((current) => ({ ...current, ...fieldErrors }));
			setServerError(getApiError(error));
		} finally {
			setSaving(false);
		}
	}
	
	async function remove(id) {
		const confirmed = await notify.confirm({
			title: "Delete appointment?",
			text: "This appointment will be permanently deleted.",
		});
		if (!confirmed) return;
		
		try {
			await appointmentsApi.remove(id);
			await load(pagination.page);
			notify.success("Appointment deleted successfully");
		} catch (error) {
			notify.error(getApiError(error));
		}
	}
	
	// UI filtering improves the experience. The backend must also enforce the same
	// ownership rules in its query/controller for real data isolation and security.
	const visibleData = data.filter((item) => {
		if (isProvider) return Boolean(ownProviderId) && appointmentProfileId(item, "provider") === Number(ownProviderId);
		if (isPatient) return Boolean(ownPatientId) && appointmentProfileId(item, "patient") === Number(ownPatientId);
		return true;
	});
	
	return (
		<>
		<PageHeader
		title="Appointments"
		description="Schedule and manage provider appointments"
		action={hasPermission("appointment.create") && <button className="primary-btn" onClick={() => open()}>+ Book Appointment</button>}
		/>
		
		<div className="data-card">
		<div className="table-wrap">
		<table className="data-table">
		<thead><tr><th>ID</th><th>Provider</th><th>Patient</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
		<tbody>
		{loading ? <tr><td colSpan="7" className="empty-cell">Loading appointments...</td></tr> :
			visibleData.length === 0 ? <tr><td colSpan="7" className="empty-cell">No appointments found.</td></tr> :
			visibleData.map((item) => (
				<tr key={item.id}>
				<td>{item.id}</td>
				<td>{item.provider?.user?.name || item.provider_name || item.provider?.name || item.provider_id || item.providerId}</td>
				<td>{item.patient?.user?.name || item.patient_name || item.patient?.name || item.patient_id || item.patientId}</td>
				<td>{getDate(item.appointment_date || item.appointmentDate)}</td>
				<td>{item.start_time || item.startTime} - {item.end_time || item.endTime}</td>
				<td><span className={`status-pill ${String(item.status || "").toLowerCase()}`}>{item.status}</span></td>
				<td><div className="action-row">
				{hasPermission("appointment.update") && <button className="outline-btn" onClick={() => open(item)}>Edit</button>}
				{!isPatient && !isProvider && hasPermission("appointment.delete") && <button className="danger-btn" onClick={() => remove(item.id)}>Delete</button>}
				</div></td>
				</tr>
			))}
			</tbody>
			</table>
			</div>
			<div className="table-footer">
			<span>Page {pagination.page} of {pagination.totalPages || 1} ({(isProvider || isPatient) ? visibleData.length : (pagination.total || data.length)} appointments)</span>
			<div className="pager">
			<button disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Previous</button>
			<button disabled={pagination.page >= (pagination.totalPages || 1)} onClick={() => load(pagination.page + 1)}>Next</button>
			</div>
			</div>
			</div>
			
			{show && <AppointmentModal
				form={form}
				options={options}
				editing={editing}
				isProvider={isProvider}
				isPatient={isPatient}
				ownProviderId={ownProviderId}
				ownPatientId={ownPatientId}
				errors={formErrors}
				serverError={serverError}
				saving={saving}
				onClose={() => setShow(false)}
				onSave={save}
				setValue={setValue}
				/>}
				</>
			);
		}
		
		function FieldError({ children }) {
			return children ? <div className="field-error">{children}</div> : null;
		}
		
		function AppointmentModal({ form, options, editing, isProvider, isPatient, ownProviderId, ownPatientId, errors, serverError, saving, onClose, onSave, setValue }) {
			return (
				<div className="modal-backdrop-custom">
				<div className="modal-card large">
				<div className="modal-head">
				<h3>{editing ? "Edit Appointment" : "Book Appointment"}</h3>
				<button type="button" aria-label="Close" onClick={onClose}>×</button>
				</div>
				
				<form onSubmit={onSave} noValidate>
				<div className="form-grid">
				<div>
				<label>Provider *</label>
				<select className={`form-select ${errors.provider_id ? "is-invalid" : ""}`} value={isProvider ? (ownProviderId || form.provider_id) : form.provider_id} disabled={isProvider} onChange={(e) => setValue("provider_id", e.target.value)}>
				<option value="">Select provider</option>
				{options.providers.map((item) => <option key={item.id} value={item.id}>{item.name || item.user?.name || item.user_id}</option>)}
				</select>
				<FieldError>{errors.provider_id}</FieldError>
				</div>
				<div>
				<label>Patient *</label>
				<select className={`form-select ${errors.patient_id ? "is-invalid" : ""}`} value={isPatient ? (ownPatientId || form.patient_id) : form.patient_id} disabled={isPatient} onChange={(e) => setValue("patient_id", e.target.value)}>
				<option value="">Select patient</option>
				{options.patients.map((item) => <option key={item.id} value={item.id}>{item.name || item.user?.name || item.user_id}</option>)}
				</select>
				<FieldError>{errors.patient_id}</FieldError>
				</div>
				<div>
				<label>Date *</label>
				<input className={`form-control ${errors.appointment_date ? "is-invalid" : ""}`} type="date" value={form.appointment_date} onChange={(e) => setValue("appointment_date", e.target.value)} />
				<FieldError>{errors.appointment_date}</FieldError>
				</div>
				<div>
				<label>Start Time *</label>
				<input className={`form-control ${errors.start_time ? "is-invalid" : ""}`} type="time" value={form.start_time} onChange={(e) => setValue("start_time", e.target.value)} />
				<FieldError>{errors.start_time}</FieldError>
				</div>
				<div>
				<label>End Time *</label>
				<input className={`form-control ${errors.end_time ? "is-invalid" : ""}`} type="time" value={form.end_time} onChange={(e) => setValue("end_time", e.target.value)} />
				<FieldError>{errors.end_time}</FieldError>
				</div>
				<div>
				<label>Status</label>
				<select className="form-select" value={form.status} onChange={(e) => setValue("status", e.target.value)}>
				<option value="scheduled">Scheduled</option>
				<option value="completed">Completed</option>
				<option value="cancelled">Cancelled</option>
				</select>
				</div>
				<div className="full">
				<label>Reason</label>
				<textarea className="form-control" rows="3" value={form.reason} onChange={(e) => setValue("reason", e.target.value)} />
				</div>
				</div>
				
				{serverError && <div className="modal-error-box">{serverError}</div>}
				
				<div className="modal-actions">
				<button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
				<button className="primary-btn" disabled={saving}>{saving ? "Saving..." : editing ? "Update Appointment" : "Save Appointment"}</button>
				</div>
				</form>
				</div>
				</div>
			);
		}
		