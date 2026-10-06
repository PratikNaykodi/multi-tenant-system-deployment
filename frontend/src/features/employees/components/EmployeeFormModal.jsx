import { useEffect, useState } from "react";

import { createEmployee, updateEmployee } from "../services/employeeService";


function EmployeeFormModal({
    employee,
    onClose,
    onSuccess
}) {
    const isEditMode = Boolean(employee);

    const [formData, setFormData] =
        useState({
            name: "",
            email: "",
            department: "",
            salary: "",
            phone: ""
        });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    /*
     * Load employee data
     * when Edit modal opens.
     */
    useEffect(() => {
        if (employee) {
            setFormData({
                name: employee.name || "",
                email: employee.email || "",
                department: employee.department || "",
                salary: employee.salary ?? "",
                phone: employee.phone || ""
            });
        } else {
            setFormData({
                name: "",
                email: "",
                department: "",
                salary: "",
                phone: ""
            });
        }

        setError("");
    }, [employee]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
                ...previous,
                [name]: value
            })
        );
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (
            !formData.name.trim() ||
            !formData.email.trim() ||
            !formData.department.trim() ||
            formData.salary === ""
        ) {
            setError("Name, email, department and salary are required.");

            return;
        }

        if ( Number(formData.salary) < 0) {
            setError("Salary cannot be negative.");

            return;
        }

        try {
            setLoading(true);

            const employeeData = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                department: formData.department.trim(),
                salary: Number(formData.salary),
                phone: formData.phone.trim() || null
            };


            let response;

            if (isEditMode) {
                response = await updateEmployee(
                        employee.id,
                        employeeData
                    );
            } else {
                response = await createEmployee(
                        employeeData
                    );
            }

            console.log("Employee saved:", response);

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Save employee error:", error);

            setError(error.response?.data?.message || "Unable to save employee.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="modal-overlay" onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <div className="user-modal">
                <div className="modal-header">
                    <div>
                        <h2>
                            {isEditMode
                                ? "Edit Employee"
                                : "Add Employee"
                            }
                        </h2>
                        <p>
                            {isEditMode
                                ? "Update employee information."
                                : "Create a new employee for this tenant."
                            }
                        </p>
                    </div>

                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                    >×
                    </button>
                </div>

                {error && (
                    <div className="modal-error">
                        {error}
                    </div>
                )}
                
                <form className="user-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter employee name"
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label>Email address</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter email address"
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label>Department</label>
                        <input
                            type="text"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            placeholder="e.g. IT, HR, Finance"
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label>Salary</label>
                        <input
                            type="number"
                            name="salary"
                            value={formData.salary}
                            onChange={handleChange}
                            placeholder="Enter salary"
                            min="0"
                            step="0.01"
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label>Phone</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Enter phone number"
                            disabled={loading}
                        />
                    </div>
                    <div className="modal-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="primary-button"
                            disabled={loading}
                        >
                            {loading
                                ? "Saving..."
                                : isEditMode
                                    ? "Update Employee"
                                    : "Create Employee"
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EmployeeFormModal;