import { useEffect, useState } from "react";
import "./UsersPage.css";
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser
} from "../services/userService";
import UserFormModal from "../components/UserFormModal";
import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permission";
import { toast } from "react-toastify";

const UsersPage = () => {
    const { user } = useAuth();

    // ========================================================
    // STATE
    // ========================================================

    const [users, setUsers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    const usersPerPage = 10;

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [editingUser, setEditingUser] = useState(null);

    const [deleteUserId, setDeleteUserId] = useState(null);

    // ========================================================
    // PERMISSIONS
    // ========================================================
    const canCreateUser =
        hasPermission(
            user,
            "user.create"
        );

    const canUpdateUser =
        hasPermission(
            user,
            "user.update"
        );

    const canDeleteUser =
        hasPermission(
            user,
            "user.delete"
        );


    // ========================================================
    // LOAD USERS
    // ========================================================
    const loadUsers = async (page = currentPage) => {
        try {
            setLoading(true);
            setError("");

            // Get users for the selected page.
            const response = await getUsers(
                page,
                usersPerPage
            );

            // Store users returned by the backend.
            setUsers(response.users || []);

            // Store pagination information returned by the backend.
            setCurrentPage( response.pagination?.page || page );

            setTotalPages( response.pagination?.totalPages || 1 );

            setTotalUsers( response.pagination?.total || 0 );

        } catch (error) {
            console.error( "Load users error:", error );

            setError( error?.response?.data?.message || "Unable to load users" );
        } finally {
            setLoading(false);
        }
    };

    // Go to the selected page.
    const handlePageChange = (page) => {
        if (page < 1 || page > totalPages) {
            return;
        }

        loadUsers(page);
    };

    // ========================================================
    // LOAD ON PAGE LOAD
    // ========================================================
    useEffect(() => {
        loadUsers();
    }, []);

    // ========================================================
    // OPEN ADD MODAL
    // ========================================================
    const handleAddUser = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    // ========================================================
    // OPEN EDIT MODAL
    // ========================================================
    const handleEditUser = (user) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    // ========================================================
    // CLOSE MODAL
    // ========================================================
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    // ========================================================
    // CREATE / UPDATE
    // ========================================================
    const handleSubmitUser = async (formData) => {
        try {
            if (editingUser) {
                await updateUser(
                    editingUser.id,
                    formData
                );
                toast.success("User updated successfully!");
            } else {
                await createUser(
                    formData
                );
                toast.success("User created successfully!");
            }

            handleCloseModal();

            await loadUsers();

        } catch (error) {
            console.error("Save user error:", error );
            throw error;
        }
    };

    // ========================================================
    // DELETE
    // ========================================================
    const handleDeleteUser = (id) => {
        setDeleteUserId(id);
    };

    const confirmDeleteUser = async () => {
        if (!deleteUserId) {
            return;
        }
        try {
            await deleteUser(deleteUserId);
            toast.success( "User deleted successfully!" );

            setDeleteUserId(null);

            await loadUsers();
        } catch (error) {
            console.error( "Delete user error:", error );

            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Unable to delete user";

            toast.error(message);
            setDeleteUserId(null);
        }
    };

    // ========================================================
    // LOADING
    // ========================================================
    if (loading) {
        return (
            <div className="p-6">
                Loading users...
            </div>
        );
    }

    // ========================================================
    // UI
    // ========================================================

    return (
        <div className="users-page">
            {/* ================================================= */}
            {/* HEADER */}
            {/* ================================================= */}
            <div className="users-page-header">
                <div>
                    <h1 className="users-page-title">
                        Users
                    </h1>
                    <p className="users-page-subtitle">
                        Manage users, providers and patients
                    </p>
                </div>

                {canCreateUser && (
                    <button
                        type="button"
                        className="users-add-button"
                        onClick={handleAddUser}
                    >
                        + Add User
                    </button>
                )}
            </div>

            {/* ================================================= */}
            {/* ERROR */}
            {/* ================================================= */}
            {error && (
                <div className="users-error">
                    {error}
                </div>
            )}

            {/* ================================================= */}
            {/* LOADING */}
            {/* ================================================= */}
            {loading ? (
                <div className="users-loading">
                    Loading users...
                </div>
            ) : (
                <div className="users-table-container">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th width="20" className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="users-empty" >
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map(
                                    (userItem) => (
                                        <tr key={ userItem.id }>
                                            <td>
                                                {
                                                    userItem.id
                                                }
                                            </td>

                                            <td>
                                                {
                                                    userItem.name
                                                }
                                            </td>

                                            <td>
                                                {
                                                    userItem.email
                                                }
                                            </td>

                                            <td>
                                                <span className="user-role-badge">

                                                    {
                                                        userItem.role
                                                    }

                                                </span>
                                            </td>

                                            <td>
                                                <div className="users-actions">
                                                    {canUpdateUser && (
                                                        <button
                                                            type="button"
                                                            className="user-edit-button"
                                                            onClick={() =>
                                                                handleEditUser(
                                                                    userItem
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </button>
                                                    )}

                                                    {canDeleteUser && (
                                                        <button
                                                            type="button"
                                                            className="user-delete-button"
                                                            onClick={() =>
                                                                handleDeleteUser(
                                                                    userItem.id
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )

                            )}
                        </tbody>
                    </table>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination-container">

                            {/* Previous Button */}
                            <button
                                type="button"
                                className="pagination-button"
                                disabled={currentPage === 1}
                                onClick={() =>
                                    handlePageChange(
                                        currentPage - 1
                                    )
                                }
                            >
                                Previous
                            </button>

                            {/* Page Numbers */}
                            {Array.from(
                                { length: totalPages },
                                (_, index) => index + 1
                            ).map((page) => (
                                <button
                                    key={page}
                                    type="button"
                                    className={`pagination-button ${
                                        currentPage === page
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        handlePageChange(page)
                                    }
                                >
                                    {page}
                                </button>
                            ))}

                            {/* Next Button */}
                            <button
                                type="button"
                                className="pagination-button"
                                disabled={
                                    currentPage === totalPages
                                }
                                onClick={() =>
                                    handlePageChange(
                                        currentPage + 1
                                    )
                                }
                            >
                                Next
                            </button>

                        </div>
                    )}

                    {/* Total Users */}
                    <div className="pagination-info">
                        Showing page {currentPage} of {totalPages}
                        {" "}({totalUsers} users)
                    </div>
                </div>
            )}


            {/* ================================================= */}
            {/* MODAL */}
            {/* ================================================= */}
            <UserFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmitUser}
                editingUser={editingUser}
            />

            {/* =========================================
                DELETE CONFIRMATION MODAL
            ========================================= */}
            {deleteUserId && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <div className="delete-modal-icon">
                            🗑️
                        </div>
                        <h2>Delete User</h2>
                        <p>
                            Are you sure you want to delete
                            this user?
                        </p>
                        <span className="delete-modal-warning">
                            This action cannot be undone.
                        </span>

                        <div className="delete-modal-actions">
                            <button
                                type="button"
                                className="delete-modal-cancel"
                                onClick={() =>
                                    setDeleteUserId(null)
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="delete-modal-confirm"
                                onClick={
                                    confirmDeleteUser
                                }
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;