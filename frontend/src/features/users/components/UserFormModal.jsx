import { useEffect, useState } from "react";
import { getRoles } from "../services/roleService";
import "./UserFormModal.css";

const initialForm = {
    name: "",
    email: "",
    password: "",
    role_id: "",

    // Provider fields
    specialization: "",
    experience_years: "",
    provider_phone: "",

    // Patient fields
    date_of_birth: "",
    gender: "",
    patient_phone: "",
    address: ""
};

const UserFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    editingUser
}) => {

    const [formData, setFormData] = useState(initialForm);

    const [roles, setRoles] = useState([]);

    const [loadingRoles, setLoadingRoles] = useState(false);

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");

    /*
    |--------------------------------------------------------------------------
    | Load roles
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const loadRoles = async () => {
            try {
                setLoadingRoles(true);
                setError("");

                const response = await getRoles();

                setRoles(response.roles || []);
            } catch (error) {
                console.error("Load roles error:", error);

                setError("Unable to load roles");
            } finally {
                setLoadingRoles(false);
            }
        };

        loadRoles();
    }, [isOpen]);

    /*
    |--------------------------------------------------------------------------
    | Populate form when editing
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        if (!editingUser) {
            setFormData(initialForm);
            setError("");

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Provider data
        |--------------------------------------------------------------------------
        */
        const provider = editingUser.provider || {};

        console.log(provider)
        /*
        |--------------------------------------------------------------------------
        | Patient data
        |--------------------------------------------------------------------------
        */
        const patient = editingUser.patient || {};

        setFormData({
            name: editingUser.name || "",

            email: editingUser.email || "",

            /*
            | Password should normally remain blank
            | during edit.
            */
            password: "",

            role_id: editingUser.role_id
                    ? String(editingUser.role_id)
                    : "",

            /*
            |--------------------------------------------------------------------------
            | Provider
            |--------------------------------------------------------------------------
            */
            specialization: provider.specialization || "",

            experience_years: provider.experience_years !== null && provider.experience_years !== undefined
                    ? String(provider.experience_years)
                    : "",

            provider_phone: provider.phone || "",

            /*
            |--------------------------------------------------------------------------
            | Patient
            |--------------------------------------------------------------------------
            */
            date_of_birth: patient.date_of_birth
                    ? String(
                        patient.date_of_birth
                    ).substring(0, 10)
                    : "",

            gender: patient.gender || "",

            patient_phone: patient.phone || "",

            address: patient.address || ""

        });
        setError("");
    }, [isOpen, editingUser]);

    /*
    |--------------------------------------------------------------------------
    | Selected role
    |--------------------------------------------------------------------------
    */
    const selectedRole =
        roles.find(
            (role) =>
                String(role.id) ===
                String(formData.role_id)
        );

    const isProvider =
        selectedRole?.name === "provider";

    const isPatient =
        selectedRole?.name === "patient";

    /*
    |--------------------------------------------------------------------------
    | Handle input change
    |--------------------------------------------------------------------------
    */
    const handleChange = (event) => {
        const {
            name,
            value
        } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));

        /*
        |--------------------------------------------------------------------------
        | Clear previous error
        |--------------------------------------------------------------------------
        */
        if (error) {
            setError("");
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Handle role change
    |--------------------------------------------------------------------------
    */
    const handleRoleChange = (event) => {
        const roleId = event.target.value;

        const role =
            roles.find(
                (item) =>
                    String(item.id) ===
                    String(roleId)
            );

        setFormData((previous) => ({
            ...previous,
            role_id: roleId,

            /*
            |--------------------------------------------------------------------------
            | If role changes, clear the old
            | role-specific fields.
            |--------------------------------------------------------------------------
            */
            specialization:
                role?.name === "provider"
                    ? previous.specialization
                    : "",

            experience_years:
                role?.name === "provider"
                    ? previous.experience_years
                    : "",

            provider_phone:
                role?.name === "provider"
                    ? previous.provider_phone
                    : "",

            date_of_birth:
                role?.name === "patient"
                    ? previous.date_of_birth
                    : "",
            gender:
                role?.name === "patient"
                    ? previous.gender
                    : "",
            patient_phone:
                role?.name === "patient"
                    ? previous.patient_phone
                    : "",
            address:
                role?.name === "patient"
                    ? previous.address
                    : ""
        }));

        if (error) {
            setError("");
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */
    const validateForm = () => {
        if (!formData.name.trim()) {
            return "Name is required";
        }

        if (!formData.email.trim()) {
            return "Email is required";
        }

        if (!editingUser &&
            !formData.password.trim()) {
            return "Password is required";
        }

        if (!formData.role_id) {
            return "Please select a role";
        }

        /*
        |--------------------------------------------------------------------------
        | Provider validation
        |--------------------------------------------------------------------------
        */
        if (isProvider) {
            if ( !formData.specialization.trim() ) {
                return ( "Specialization is required" );
            }

            if (
                formData.experience_years !== "" &&
                (
                    Number( formData.experience_years ) < 0
                )
            ) {
                return ( "Experience cannot be negative" );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Patient validation
        |--------------------------------------------------------------------------
        */
        if (isPatient) {
            if (!formData.date_of_birth) {
                return ( "Date of birth is required" );
            }
        }

        return null;
    };

    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */
    const handleSubmit = async (event) => {
        event.preventDefault();

        const validationError = validateForm();

        if (validationError) {
            setError( validationError );
            return;
        }

        try {
            setSaving(true);
            setError("");

            /*
            |--------------------------------------------------------------------------
            | Prepare data
            |--------------------------------------------------------------------------
            */
            const data = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                role_id: Number( formData.role_id )
            };

            /*
            |--------------------------------------------------------------------------
            | Password
            |--------------------------------------------------------------------------
            |
            | On create:
            |   password is required.
            |
            | On edit:
            |   password is sent only if
            |   the user entered a new password.
            |
            */
            if ( formData.password.trim() ) {
                data.password = formData.password;
            }

            /*
            |--------------------------------------------------------------------------
            | Provider
            |--------------------------------------------------------------------------
            */
            if (isProvider) {
                data.specialization = formData.specialization.trim();

                data.experience_years =
                    formData.experience_years === ""
                        ? 0
                        : Number(
                            formData.experience_years
                        );

                data.provider_phone = formData.provider_phone.trim();

            }

            /*
            |--------------------------------------------------------------------------
            | Patient
            |--------------------------------------------------------------------------
            */
            if (isPatient) {
                data.date_of_birth =
                    formData.date_of_birth ||
                    null;

                data.gender =
                    formData.gender ||
                    null;

                data.patient_phone = formData.patient_phone.trim();

                data.address = formData.address.trim();

            }

            /*
            |--------------------------------------------------------------------------
            | Send data to parent
            |--------------------------------------------------------------------------
            */
            await onSubmit(data);
        } catch (error) {

            console.error(
                "Save user error:",
                error
            );

            /*
            |--------------------------------------------------------------------------
            | Show backend error
            |--------------------------------------------------------------------------
            */
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Unable to save user";

            setError(message);
        } finally {
            setSaving(false);
        }

    };

    /*
    |--------------------------------------------------------------------------
    | Do not render modal when closed
    |--------------------------------------------------------------------------
    */
    if (!isOpen) {
        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <div className="user-modal-overlay">
            <div className="user-modal">

                {/* -----------------------------------------------------------
                    Header
                ------------------------------------------------------------ */}
                <div className="user-modal-header">
                    <div>
                        <h2>
                            {editingUser
                                ? "Edit User"
                                : "Create User"
                            }
                        </h2>
                        <p>
                            {editingUser
                                ? "Update user information"
                                : "Create a new user account"
                            }
                        </p>

                    </div>

                    <button
                        type="button"
                        className="user-modal-close"
                        onClick={onClose}
                        disabled={saving}
                    >
                        ×
                    </button>
                </div>

                {/* -----------------------------------------------------------
                    Form
                ------------------------------------------------------------ */}
                <form className="user-form" onSubmit={handleSubmit} >

                    {/* -------------------------------------------------------
                        Scrollable body
                    -------------------------------------------------------- */}
                    <div className="user-modal-body">
                        {/* ---------------------------------------------------
                            Error
                        ---------------------------------------------------- */}
                        {error && (
                            <div className="user-form-error">
                                {error}
                            </div>

                        )}

                        {/* ---------------------------------------------------
                            Name
                        ---------------------------------------------------- */}

                        <div className="user-form-group">
                            <label htmlFor="name">
                                Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter name"
                                disabled={saving}
                            />
                        </div>

                        {/* ---------------------------------------------------
                            Email
                        ---------------------------------------------------- */}

                        <div className="user-form-group">
                            <label htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter email"
                                disabled={saving}
                            />
                        </div>

                        {/* ---------------------------------------------------
                            Password
                        ---------------------------------------------------- */}
                        <div className="user-form-group">
                            <label htmlFor="password">
                                Password
                                {editingUser && (
                                    <span className="optional-label">
                                        {" "}
                                        (leave blank to keep current)
                                    </span>
                                )}

                            </label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder={
                                    editingUser
                                        ? "Enter new password"
                                        : "Enter password"
                                }
                                disabled={saving}
                            />
                        </div>

                        {/* ---------------------------------------------------
                            Role
                        ---------------------------------------------------- */}
                        <div className="user-form-group">

                            <label htmlFor="role_id">
                                Role
                            </label>
                            <select
                                id="role_id"
                                name="role_id"
                                value={formData.role_id}
                                onChange={handleRoleChange}
                                disabled={
                                    saving ||
                                    loadingRoles
                                }
                            >
                                <option value="">
                                    {loadingRoles
                                        ? "Loading roles..."
                                        : "Select role"
                                    }
                                </option>

                                {roles.map(
                                    (role) => (
                                        <option
                                            key={role.id}
                                            value={role.id}
                                        >
                                            {role.name}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        {/* ===================================================
                            PROVIDER FIELDS
                        ==================================================== */}
                        {isProvider && (
                            <div className="role-specific-section">
                                <div className="role-section-title">
                                    Provider Information
                                </div>

                                {/* Specialization */}
                                <div className="user-form-group">
                                    <label htmlFor="specialization">
                                        Specialization
                                    </label>
                                    <input
                                        id="specialization"
                                        type="text"
                                        name="specialization"
                                        value={
                                            formData.specialization
                                        }
                                        onChange={handleChange}
                                        placeholder="e.g. Cardiology"
                                        disabled={saving}
                                    />
                                </div>

                                {/* Experience */}
                                <div className="user-form-group">
                                    <label htmlFor="experience_years">
                                        Experience (Years)
                                    </label>
                                    <input
                                        id="experience_years"
                                        type="number"
                                        name="experience_years"
                                        value={
                                            formData.experience_years
                                        }
                                        onChange={handleChange}
                                        placeholder="e.g. 8"
                                        min="0"
                                        disabled={saving}
                                    />
                                </div>

                                {/* Phone */}
                                <div className="user-form-group">
                                    <label htmlFor="provider_phone">
                                        Phone
                                    </label>
                                    <input
                                        id="provider_phone"
                                        type="tel"
                                        name="provider_phone"
                                        value={
                                            formData.provider_phone
                                        }
                                        onChange={handleChange}
                                        placeholder="Enter phone number"
                                        disabled={saving}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ===================================================
                            PATIENT FIELDS
                        ==================================================== */}
                        {isPatient && (
                            <div className="role-specific-section">
                                <div className="role-section-title">
                                    Patient Information
                                </div>

                                {/* Date of Birth */}
                                <div className="user-form-group">
                                    <label htmlFor="date_of_birth">
                                        Date of Birth
                                    </label>
                                    <input
                                        id="date_of_birth"
                                        type="date"
                                        name="date_of_birth"
                                        value={
                                            formData.date_of_birth
                                        }
                                        onChange={handleChange}
                                        disabled={saving}
                                    />
                                </div>

                                {/* Gender */}
                                <div className="user-form-group">
                                    <label htmlFor="gender">
                                        Gender
                                    </label>
                                    <select
                                        id="gender"
                                        name="gender"
                                        value={
                                            formData.gender
                                        }
                                        onChange={handleChange}
                                        disabled={saving}
                                    >
                                        <option value="">
                                            Select gender
                                        </option>
                                        <option value="Male">
                                            Male
                                        </option>
                                        <option value="Female">
                                            Female
                                        </option>
                                        <option value="Other">
                                            Other
                                        </option>
                                    </select>
                                </div>

                                {/* Phone */}
                                <div className="user-form-group">
                                    <label htmlFor="patient_phone">
                                        Phone
                                    </label>

                                    <input
                                        id="patient_phone"
                                        type="tel"
                                        name="patient_phone"
                                        value={
                                            formData.patient_phone
                                        }
                                        onChange={handleChange}
                                        placeholder="Enter phone number"
                                        disabled={saving}
                                    />

                                </div>

                                {/* Address */}
                                <div className="user-form-group">
                                    <label htmlFor="address">
                                        Address
                                    </label>

                                    <textarea
                                        id="address"
                                        name="address"
                                        value={
                                            formData.address
                                        }
                                        onChange={handleChange}
                                        placeholder="Enter address"
                                        rows="3"
                                        disabled={saving}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* -------------------------------------------------------
                        Footer
                    -------------------------------------------------------- */}
                    <div className="user-modal-footer">
                        <button
                            type="button"
                            className="user-cancel-button"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="user-submit-button"
                            disabled={
                                saving ||
                                loadingRoles
                            }
                        >

                            {saving
                                ? "Saving..."
                                : editingUser
                                    ? "Update User"
                                    : "Create User"
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserFormModal;
