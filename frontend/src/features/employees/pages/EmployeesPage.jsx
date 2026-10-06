
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permission";

import { getEmployees, deleteEmployee } from "../services/employeeService";
import EmployeeFormModal from "../components/EmployeeFormModal";

function EmployeesPage() {
    const { user } = useAuth();

    /*
    |--------------------------------------------------------------------------
    | Permissions
    |--------------------------------------------------------------------------
    */
    const canCreateEmployee = hasPermission(user, "employee.create");
    const canUpdateEmployee = hasPermission(user, "employee.update");
    const canDeleteEmployee = hasPermission(user, "employee.delete");

    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | Load Employees
    |--------------------------------------------------------------------------
    */

    const loadEmployees = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getEmployees();
            setEmployees(data.employees || []);

        } catch (error) {
            console.error("Load employees error:", error);

            setError(error.response?.data?.message || "Unable to load employees.");
        } finally {
            setLoading(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Delete Employee
    |--------------------------------------------------------------------------
    */
    const handleDelete = async (id) => {
        const confirmed = window.confirm("Are you sure you want to delete this employee?");
        if (!confirmed) {
            return;
        }

        try {
            await deleteEmployee(id);
            setEmployees(
                (previousEmployees) =>
                    previousEmployees.filter(
                        (employee) =>
                            employee.id !== id
                    )
            );

        } catch (error) {
            console.error("Delete employee error:", error);
            setError(error.response?.data?.message || "Unable to delete employee.");
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Load Employees On Page Load
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        loadEmployees();
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */
    return (
        <div className="users-page">
            {/* --------------------------------------------------
                Page Header
            -------------------------------------------------- */}

            <div className="page-header">
                <div>
                    <h1>Employees</h1>
                    <p>
                        Manage employees for this tenant.
                    </p>
                </div>

                {/* Add Employee */}
                {canCreateEmployee && (
                    <button
                        className="primary-button"
                        onClick={() => {
                             setSelectedEmployee(null);
                            setShowAddModal(true);
                        }}
                    >
                        + Add Employee
                    </button>
                )}
            </div>

            {/* --------------------------------------------------
                Error
            -------------------------------------------------- */}
            {error && (
                <div className="page-error">
                    {error}
                </div>
            )}

            {/* --------------------------------------------------
                Employee Table
            -------------------------------------------------- */}
            <div className="table-card">
                {loading ? (
                    <div className="table-loading">
                        Loading employees...
                    </div>
                ) : employees.length === 0 ? (
                    <div className="empty-state">
                        No employees found.
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Email</th>
                                    <th>Department</th>
                                    <th>Salary</th>
                                    <th>Phone</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(
                                    (employee) => (
                                        <tr key={ employee.id }>
                                            {/* Employee */}
                                            <td>
                                                <div className="user-cell">
                                                    <div className="table-avatar">
                                                        {employee.name
                                                            ?.charAt(0)
                                                            ?.toUpperCase()}
                                                    </div>
                                                    <strong>{employee.name}</strong>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td>{employee.email}</td>

                                            {/* Department */}
                                            <td>{employee.department}</td>

                                            {/* Salary */}
                                            <td>₹ {employee.salary}</td>

                                            {/* Phone */}
                                            <td>{employee.phone || "-"}</td>

                                            {/* Created */}
                                            <td>
                                                {employee.created_at
                                                    ? new Date(
                                                        employee.created_at
                                                    ).toLocaleDateString()
                                                    : "-"
                                                }
                                            </td>

                                            {/* Actions */}
                                            <td>
                                                <div className="table-actions">
                                                    {/* Edit */}
                                                    {canUpdateEmployee && (
                                                        <button
                                                            className="action-button edit"
                                                            onClick={() => {
                                                                setSelectedEmployee(employee);
                                                                setShowAddModal(true);
                                                            }}
                                                        >Edit
                                                        </button>
                                                    )}

                                                    {/* Delete */}
                                                    {canDeleteEmployee && (
                                                        <button
                                                            className="action-button delete"
                                                            onClick={() => {
                                                                handleDelete(
                                                                    employee.id
                                                                );
                                                            }}
                                                        >Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --------------------------------------------------
                Add Employee Modal
            -------------------------------------------------- */}
            {showAddModal && (
                <EmployeeFormModal employee={selectedEmployee}
                    onClose={() => {
                        setShowAddModal(false);
                        setSelectedEmployee(null);
                    }}
                    onSuccess={() => {
                        loadEmployees();
                    }}
                />
            )}
        </div>
    );
}

export default EmployeesPage;
