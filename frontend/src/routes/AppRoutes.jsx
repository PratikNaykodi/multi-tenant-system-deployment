import {
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import LoginPage
    from "../features/auth/pages/LoginPage";

import DashboardLayout
    from "../layouts/DashboardLayout";

import DashboardPage
    from "../pages/DashboardPage";

import NotFoundPage
    from "../pages/NotFoundPage";

import ProtectedRoute
    from "./ProtectedRoute";

import UsersPage
    from "../features/users/pages/UsersPage";

import PermissionRoute
    from "./PermissionRoute";

import EmployeesPage
    from "../features/employees/pages/EmployeesPage";

import TenantCreationPage
    from "../features/tenants/pages/TenantCreationPage";

import AppointmentsPage
    from "../features/appointments/pages/AppointmentsPage";

import ProfilePage
    from "../features/profile/pages/ProfilePage";


function AppRoutes() {
    // =========================================================
    // CURRENT HOSTNAME
    // =========================================================
    const hostname = window.location.hostname.toLowerCase();

    // =========================================================
    // CENTRAL APPLICATION
    //
    // Production:
    // https://mytenantdemo.site
    //
    // Local:
    // http://localhost:5173
    // =========================================================
    const isCentralApplication =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "mytenantdemo.site";

    // =========================================================
    // TENANT APPLICATION
    //
    // Production examples:
    //
    // https://abc.mytenantdemo.site
    // https://pqr.mytenantdemo.site
    //
    // Local example:
    //
    // http://pqr.local:5173
    // =========================================================
    const isTenantApplication =
        !isCentralApplication;

    return (
        <Routes>
            {/* =================================================
                CENTRAL APPLICATION
                =================================================

                Production:
                https://mytenantdemo.site

                Local:
                http://localhost:5173

                This application is responsible for
                creating tenants.
            ================================================= */}
            {isCentralApplication && (
                <>
                    {/* Central Home */}
                    <Route
                        path="/"
                        element={
                            <TenantCreationPage />
                        }
                    />

                    {/* If someone opens /login on the
                        central domain, send them back
                        to tenant creation. */}
                    <Route
                        path="/login"
                        element={
                            <Navigate
                                to="/"
                                replace
                            />
                        }
                    />
                </>
            )}

            {/* =================================================
                TENANT APPLICATION
                =================================================

                Examples:

                https://abc.mytenantdemo.site
                https://pqr.mytenantdemo.site

                Local:

                http://pqr.local:5173
            ================================================= */}
            {isTenantApplication && (
                <>
                    {/* =========================================
                        TENANT LOGIN
                    ========================================= */}
                    <Route
                        path="/login"
                        element={
                            <LoginPage />
                        }
                    />

                    {/* =========================================
                        TENANT ROOT

                        If user opens:

                        https://abc.mytenantdemo.site

                        send them to dashboard.

                        ProtectedRoute will check authentication.
                        If not logged in, it should redirect
                        to /login.
                    ========================================= */}
                    <Route
                        path="/"
                        element={
                            <Navigate
                                to="/dashboard"
                                replace
                            />
                        }
                    />

                    {/* =========================================
                        PROTECTED APPLICATION
                    ========================================= */}
                    <Route
                        element={
                            <ProtectedRoute>
                                <DashboardLayout />
                            </ProtectedRoute>
                        }
                    >
                        {/* =====================================
                            DASHBOARD
                        ===================================== */}
                        <Route
                            path="/dashboard"
                            element={
                                <DashboardPage />
                            }
                        />

                        {/* =====================================
                            USERS
                        ===================================== */}
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

                        {/* =====================================
                            APPOINTMENTS
                        ===================================== */}
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

                        {/* =====================================
                            EMPLOYEES
                        ===================================== */}
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

                        {/* =====================================
                            PROFILE
                        ===================================== */}
                        <Route
                            path="/profile"
                            element={
                                <ProfilePage />
                            }
                        />
                    </Route>
                </>
            )}

            {/* =================================================
                NOT FOUND
            ================================================= */}
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