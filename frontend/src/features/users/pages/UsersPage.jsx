import { Fragment, useEffect, useState } from "react";
import { usersApi, rolesApi } from "../../../services/crud.js";
import { getApiError, getApiFieldErrors } from "../../../utils/errors.js";
import { validateUserForm } from "../../../utils/validation.js";
import { notify } from "../../../utils/notify.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import PageHeader from "../../../components/PageHeader.jsx";

const makeBlank = () => ({
	name: "",
	email: "",
	password: "",
	role_id: "",
	role_name: "",
	provider: { specialization: "", experience_years: "", provider_phone: "" },
	patient: { date_of_birth: "", gender: "", patient_phone: "", address: "" },
});

function getUserFromResponse(response) {
  	return response?.data?.user || response?.data?.data?.user || response?.data;
}

function normaliseUser(user) {
	const roleId = user?.role_id ?? user?.roleId ?? user?.role?.id ?? "";
	const roleName = typeof user?.role === "object" ? user.role?.name : user?.role;
	const provider = user?.provider || {};
	const patient = user?.patient || {};

	return {
		...makeBlank(),
		...user,
		role_id: roleId,
		role_name: roleName || "",
		password: "",
		provider: {
		specialization: provider.specialization || "",
		experience_years: provider.experience_years ?? provider.experienceYears ?? "",
		provider_phone: provider.provider_phone || provider.phone || "",
		},
		patient: {
		date_of_birth: String(patient.date_of_birth || patient.dateOfBirth || "").slice(0, 10),
		gender: patient.gender || "",
		patient_phone: patient.patient_phone || patient.phone || "",
		address: patient.address || "",
		},
	};
}

function roleNameOf(user) {
	const role = user?.role;
	return String(typeof role === "object" ? role?.name : role || user?.role_name || "").trim().toLowerCase();
}

function userIdOf(user) {
  	return Number(user?.id ?? user?.userId ?? user?.user_id);
}

export default function UsersPage() {
	const { user: currentUser, hasPermission } = useAuth();
	const currentRole = roleNameOf(currentUser);
	const currentUserId = userIdOf(currentUser);
	const isAdmin = currentRole === "admin";
	const isManager = currentRole === "manager";

	// Managers may manage provider/patient accounts and update their own profile.
	// Admins can manage all user types. The backend must enforce the same rules.
	const [users, setUsers] = useState([]);
	const [roles, setRoles] = useState([]);
	const [form, setForm] = useState(makeBlank());
	const [editing, setEditing] = useState(null);
	const [show, setShow] = useState(false);
	const [formErrors, setFormErrors] = useState({});
	const [serverError, setServerError] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [loadingEdit, setLoadingEdit] = useState(false);

	async function load() {
		setLoading(true);
		try {
		const [userResponse, roleResponse] = await Promise.all([usersApi.list(), rolesApi.list()]);
		const fetchedUsers = userResponse.data?.users || userResponse.data?.data?.users || userResponse.data || [];
		// Managers only see provider and patient accounts in this listing.
		// This is a UI filter; enforce the same restriction in the backend API too.
		setUsers(isManager
			? fetchedUsers.filter((item) => ["provider", "patient"].includes(roleNameOf(item)))
			: fetchedUsers);
		setRoles(roleResponse.data?.roles || roleResponse.data?.data?.roles || roleResponse.data || []);
		} catch (error) {
		notify.error(getApiError(error));
		} finally {
		setLoading(false);
		}
	}

  	useEffect(() => { load(); }, [isManager]);

	function setValue(name, value) {
		setForm((current) => ({ ...current, [name]: value }));
		setFormErrors((current) => ({ ...current, [name]: "" }));
	}

	function setNested(section, name, value) {
		setForm((current) => ({
		...current,
		[section]: { ...current[section], [name]: value },
		}));
		setFormErrors((current) => ({ ...current, [name]: "" }));
	}

	async function open(user = null) {
		setServerError("");
		setFormErrors({});
		setEditing(user);
		setShow(true);

		if (!user) {
		setForm(makeBlank());
		return;
		}

		// Fetch the complete record. The list API may intentionally return a compact user.
		setLoadingEdit(true);
		try {
		const response = await usersApi.get(user.id);
		const fullUser = getUserFromResponse(response);
		setForm(normaliseUser(fullUser || user));
		} catch (error) {
		setForm(normaliseUser(user));
		notify.error(`Could not load full user details. ${getApiError(error)}`);
		} finally {
		setLoadingEdit(false);
		}
	}

	function handleRoleChange(event) {
		const roleId = event.target.value;
		const selected = roles.find((role) => Number(role.id) === Number(roleId));
		const nextRole = String(selected?.name || "").trim().toLowerCase();

		// Clear both role-specific sections every time the role changes. This prevents
		// stale provider values reappearing after switching Provider -> Patient -> Provider.
		setForm((current) => ({
		...current,
		role_id: roleId,
		role_name: nextRole,
		// Always discard fields belonging to the previous role. These values are
		// deliberately not restored if the user switches back to that role.
		provider: { specialization: "", experience_years: "", provider_phone: "" },
		patient: { date_of_birth: "", gender: "", patient_phone: "", address: "" },
		specialization: "", experience_years: "", provider_phone: "",
		date_of_birth: "", gender: "", patient_phone: "", address: "",
		}));
		setFormErrors({});
		setServerError("");
	}

	function buildPayload() {
		// Resolve the role from the selected role id too, so payload creation does
		// not depend only on the text stored in role_name.
		const selectedRole = roles.find((item) => Number(item.id) === Number(form.role_id));
		const role = String(form.role_name || selectedRole?.name || "").trim().toLowerCase();
		const payload = {
		name: String(form.name).trim(),
		email: String(form.email).trim(),
		role_id: Number(form.role_id),
		};

		if (form.password) payload.password = form.password;

		// The current backend UserService reads these profile fields at the root
		// of req.body (input.specialization, input.experience_years, etc.).
		// Sending them only inside payload.provider/payload.patient makes the API
		// think the required fields are empty.
		if (role === "provider") {
		payload.specialization = String(form.provider.specialization || "").trim();
		payload.experience_years = Number(form.provider.experience_years);
		payload.provider_phone = String(form.provider.provider_phone || "").trim();
		}

		if (role === "patient") {
		payload.date_of_birth = form.patient.date_of_birth || null;
		payload.gender = String(form.patient.gender || "").trim();
		payload.patient_phone = String(form.patient.patient_phone || "").trim();
		payload.address = String(form.patient.address || "").trim();
		}

		return payload;
	}

	async function save(event) {
		event.preventDefault();
		setServerError("");

		// A user can edit their own name/email/password, but cannot change their role.
		const formForSave = { ...form };
		if (editing && userIdOf(editing) === currentUserId) {
		formForSave.role_id = String(editing.role_id ?? editing.roleId ?? editing.role?.id ?? form.role_id);
		formForSave.role_name = roleNameOf(editing) || form.role_name;
		}

		const validation = validateUserForm(formForSave, Boolean(editing));
		setFormErrors(validation);
		if (Object.keys(validation).length) return;

		setSaving(true);
		try {
		if (editing && userIdOf(editing) === currentUserId) {
			// Build the self-update payload from a role-locked copy without mutating React state.
			const selectedRole = roles.find((item) => Number(item.id) === Number(formForSave.role_id));
			const role = String(formForSave.role_name || selectedRole?.name || "").trim().toLowerCase();
			const payload = { name: String(formForSave.name).trim(), email: String(formForSave.email).trim(), role_id: Number(formForSave.role_id) };
			if (formForSave.password) payload.password = formForSave.password;
			if (role === "provider") {
			payload.specialization = String(formForSave.provider.specialization || "").trim();
			payload.experience_years = Number(formForSave.provider.experience_years || 0);
			payload.provider_phone = String(formForSave.provider.provider_phone || "").trim();
			}
			if (role === "patient") {
			payload.date_of_birth = formForSave.patient.date_of_birth || null;
			payload.gender = String(formForSave.patient.gender || "").trim();
			payload.patient_phone = String(formForSave.patient.patient_phone || "").trim();
			payload.address = String(formForSave.patient.address || "").trim();
			}
			await usersApi.update(editing.id, payload);
		} else if (editing) await usersApi.update(editing.id, buildPayload());
		else await usersApi.create(buildPayload());

		setShow(false);
		await load();
		notify.success(editing ? "User updated successfully" : "User created successfully");
		} catch (error) {
		const fieldErrors = getApiFieldErrors(error);
		setFormErrors((current) => ({ ...current, ...fieldErrors }));
		setServerError(getApiError(error));
		} finally {
		setSaving(false);
		}
	}

	async function remove(id) {
		if (Number(id) === currentUserId) {
		notify.error("You cannot delete your own account.");
		return;
		}
		const target = users.find((item) => Number(item.id) === Number(id));
		if (isManager && !["provider", "patient"].includes(roleNameOf(target))) {
		notify.error("Managers can delete provider and patient accounts only.");
		return;
		}
		const confirmed = await notify.confirm({
		title: "Delete user?",
		text: "This user will be permanently deleted.",
		});
		if (!confirmed) return;

		try {
		await usersApi.remove(id);
		await load();
		notify.success("User deleted successfully");
		} catch (error) {
		notify.error(getApiError(error));
		}
	}

  return (
		<>
			<PageHeader
				title="Users"
				description={isManager ? "Manage provider and patient accounts" : "Manage users, providers and patients"}
				action={(isAdmin || (isManager && hasPermission("user.create"))) && (
				<button className="primary-btn" onClick={() => open()}>+ Add User</button>
				)}
			/>

			<div className="data-card">
				<div className="table-wrap">
					<table className="data-table">
						<thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
						<tbody>
							{loading ? <tr><td colSpan="5" className="empty-cell">Loading users...</td></tr> :
							users.length === 0 ? <tr><td colSpan="5" className="empty-cell">No users found.</td></tr> :
							users.map((user) => (
								<tr key={user.id}>
									<td>{user.id}</td>
									<td>{user.name}</td>
									<td>{user.email}</td>
									<td><span className="role-pill">{typeof user.role === "object" ? user.role?.name : user.role}</span></td>
									<td>
										<div className="action-row">
											{(Number(user.id) === currentUserId || isAdmin || (isManager && ["provider", "patient"].includes(roleNameOf(user)))) &&
											(hasPermission("user.update") || Number(user.id) === currentUserId) &&
											<button className="outline-btn" onClick={() => open(user)}>Edit</button>}
											{Number(user.id) !== currentUserId && (isAdmin || (isManager && ["provider", "patient"].includes(roleNameOf(user)))) && hasPermission("user.delete") &&
											<button className="danger-btn" onClick={() => remove(user.id)}>Delete</button>}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="table-footer">Showing {users.length} user(s)</div>
			</div>

			{show && (
				<UserModal
				form={form}
				roles={roles}
				editing={editing}
				errors={formErrors}
				serverError={serverError}
				loading={loadingEdit}
				saving={saving}
				onClose={() => setShow(false)}
				onSave={save}
				setValue={setValue}
				setNested={setNested}
				onRoleChange={handleRoleChange}
				isSelf={Boolean(editing && userIdOf(editing) === currentUserId)}
				isManager={isManager}
				isAdmin={isAdmin}
				/>
			)}
		</>
  	);
}

function FieldError({ children }) {
  	return children ? <div className="field-error">{children}</div> : null;
}

function UserModal({ form, roles, editing, errors, serverError, loading, saving, onClose, onSave, setValue, setNested, onRoleChange, isSelf, isManager, isAdmin }) {
	const role = String(form.role_name || roles.find((item) => Number(item.id) === Number(form.role_id))?.name || "").toLowerCase();
	// Managers can create only Provider and Patient users; never Admin or Manager.
	const allowedRoles = isManager && !isAdmin
		? roles.filter((item) => ["provider", "patient"].includes(String(item.name).toLowerCase()))
		: roles;

  return (
		<div className="modal-backdrop-custom">
			<div className="modal-card">
				<div className="modal-head">
				<h3>{editing ? "Edit User" : "Add User"}</h3>
				<button type="button" aria-label="Close" onClick={onClose}>×</button>
				</div>

				{loading ? <div className="modal-loading">Loading user details...</div> : (
					<form onSubmit={onSave} noValidate>
						<div className="form-grid">
							<div>
								<label>Name *</label>
								<input className={`form-control ${errors.name ? "is-invalid" : ""}`} value={form.name} onChange={(e) => setValue("name", e.target.value)} />
								<FieldError>{errors.name}</FieldError>
							</div>
							<div>
								<label>Email *</label>
								<input className={`form-control ${errors.email ? "is-invalid" : ""}`} type="email" value={form.email} onChange={(e) => setValue("email", e.target.value)} />
								<FieldError>{errors.email}</FieldError>
							</div>
							<div>
								<label>Password {editing ? "(leave blank to keep current)" : "*"}</label>
								<input className={`form-control ${errors.password ? "is-invalid" : ""}`} type="password" value={form.password} onChange={(e) => setValue("password", e.target.value)} />
								<FieldError>{errors.password}</FieldError>
							</div>
							<div>
								<label>Role *</label>
								<select className={`form-select ${errors.role_id ? "is-invalid" : ""}`} value={form.role_id} onChange={onRoleChange} disabled={isSelf}>
								<option value="">Select role</option>
								{allowedRoles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
								</select>
								{isSelf && <small className="text-muted">Your own role cannot be changed here.</small>}
								<FieldError>{errors.role_id}</FieldError>
							</div>

							{role === "provider" && <Fragment key={`provider-fields-${form.role_id}`}>
								<div><label>Specialization *</label><input className={`form-control ${errors.specialization ? "is-invalid" : ""}`} value={form.provider.specialization} onChange={(e) => setNested("provider", "specialization", e.target.value)} /><FieldError>{errors.specialization}</FieldError></div>
								<div><label>Experience (years) *</label><input className={`form-control ${errors.experience_years ? "is-invalid" : ""}`} type="number" min="0" value={form.provider.experience_years} onChange={(e) => setNested("provider", "experience_years", e.target.value)} /><FieldError>{errors.experience_years}</FieldError></div>
								<div><label>Provider Phone *</label><input className={`form-control ${errors.provider_phone ? "is-invalid" : ""}`} value={form.provider.provider_phone} onChange={(e) => setNested("provider", "provider_phone", e.target.value)} /><FieldError>{errors.provider_phone}</FieldError></div>
							</Fragment>}

							{role === "patient" && <Fragment key={`patient-fields-${form.role_id}`}>
								<div><label>Date of Birth *</label><input className={`form-control ${errors.date_of_birth ? "is-invalid" : ""}`} type="date" value={form.patient.date_of_birth} onChange={(e) => setNested("patient", "date_of_birth", e.target.value)} /><FieldError>{errors.date_of_birth}</FieldError></div>
								<div><label>Gender *</label><select className={`form-select ${errors.gender ? "is-invalid" : ""}`} value={form.patient.gender} onChange={(e) => setNested("patient", "gender", e.target.value)}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select><FieldError>{errors.gender}</FieldError></div>
								<div><label>Patient Phone *</label><input className={`form-control ${errors.patient_phone ? "is-invalid" : ""}`} value={form.patient.patient_phone} onChange={(e) => setNested("patient", "patient_phone", e.target.value)} /><FieldError>{errors.patient_phone}</FieldError></div>
								<div className="full"><label>Address</label><textarea className="form-control" rows="3" value={form.patient.address} onChange={(e) => setNested("patient", "address", e.target.value)} /></div>
							</Fragment>}
						</div>

						{serverError && <div className="modal-error-box">{serverError}</div>}

						<div className="modal-actions">
						<button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
						<button className="primary-btn" disabled={saving}>{saving ? "Saving..." : editing ? "Update User" : "Save User"}</button>
						</div>
					</form>
				)}
			</div>
		</div>
  	);
}