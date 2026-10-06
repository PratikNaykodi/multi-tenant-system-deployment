import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../features/auth/pages/LoginPage";
import DashboardLayout from "../layouts/DashboardLayout";
import DashboardPage from "../pages/DashboardPage";
import NotFoundPage from "../pages/NotFoundPage";
import ProtectedRoute from "./ProtectedRoute";
import UsersPage from "../features/users/pages/UsersPage";
import PermissionRoute from "./PermissionRoute";
import EmployeesPage from "../features/employees/pages/EmployeesPage";
import TenantCreationPage from "../features/tenants/pages/TenantCreationPage";
import AppointmentsPage from "../features/appointments/pages/AppointmentsPage";
import ProfilePage from "../features/profile/pages/ProfilePage";

function AppRoutes() {
    const isCentralApplication = window.location.hostname === "localhost";

    return (
        <Routes>
            {/* =========================================
                CENTRAL APPLICATION
                http://localhost:5173/
            ========================================= */}
            {isCentralApplication && (
                <Route
                    path="/"
                    element={
                        <TenantCreationPage />
                    }
                />
            )}

            {/* =========================================
                TENANT APPLICATION
                http://pqr.local:5173/
            ========================================= */}
            {!isCentralApplication && (
                <>
                    <Route
                        path="/login"
                        element={
                            <LoginPage />
                        }
                    />

                    <Route
                        path="/"
                        element={
                            <Navigate
                                to="/dashboard"
                                replace
                            />
                        }
                    />

                    <Route
                        element={
                            <ProtectedRoute>
                                <DashboardLayout />
                            </ProtectedRoute>
                        }
                    >

                        {/* Dashboard */}
                        <Route
                            path="/dashboard"
                            element={
                                <DashboardPage />
                            }
                        />

                        {/* Users */}
                        <Route
                            path="/users"
                            element={
                                <PermissionRoute
                                    permission="user.read"
                                >
                                    <UsersPage />
                                </PermissionRoute>
                            }
                        />

                        <Route
                            path="/appointments"
                            element={
                                <PermissionRoute
                                    permission="appointment.read"
                                >
                                    <AppointmentsPage />
                                </PermissionRoute>
                            }
                        />

                        {/* Employees */}
                        <Route
                            path="/employees"
                            element={
                                <PermissionRoute
                                    permission="employee.read"
                                >
                                    <EmployeesPage />
                                </PermissionRoute>
                            }
                        />

                        <Route
                            path="/profile"
                            element={
                                <ProfilePage />
                            }
                        />
                    </Route>
                </>
            )}

            {/* =========================================
                NOT FOUND
            ========================================= */}
            <Route
                path="*"
                element={
                    <NotFoundPage />
                }
            />
        </Routes>
    );
}

export default AppRoutes;