import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./context/AuthContext.jsx";
import { isCentralHost } from "./utils/tenant.js";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import PermissionRoute from "./routes/PermissionRoute.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import DashboardPage from "./features/auth/pages/DashboardPage.jsx";
import ForbiddenPage from "./features/auth/pages/ForbiddenPage.jsx";
import NotFoundPage from "./features/auth/pages/NotFoundPage.jsx";
import ProfilePage from "./features/auth/pages/ProfilePage.jsx";
import TenantCreationPage from "./features/tenants/pages/TenantCreationPage.jsx";
import UsersPage from "./features/users/pages/UsersPage.jsx";
import RolesPage from "./features/roles/pages/RolesPage.jsx";
import AppointmentsPage from "./features/appointments/pages/AppointmentsPage.jsx";

function TenantCreateEntry() {
    // On a tenant hostname this page is never available. It is an authenticated application URL.
    if (!isCentralHost()) return <Navigate to="/login" replace />;
    return <TenantCreationPage />;
}

function RootEntry() {
    const { user, loading } = useAuth();
    if (loading) return <div className="screen-loader">Loading...</div>;
    if (isCentralHost()) return <Navigate to="/tenant/create" replace />;
    return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function TenantUnknownRoute() {
    const { user } = useAuth();
    if (isCentralHost()) return <Navigate to="/tenant/create" replace />;
    return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  const { user } = useAuth();
  return <Routes>
            <Route path="/" element={<RootEntry />} />
            <Route path="/login" element={isCentralHost() ? <Navigate to="/tenant/create" replace /> : user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
            <Route path="/tenant/create" element={<TenantCreateEntry />} />
            <Route path="/403" element={<ForbiddenPage />} />
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/users" element={<PermissionRoute permission="user.read" />}><Route index element={<UsersPage />} /></Route>
                    <Route path="/appointments" element={<PermissionRoute permission="appointment.read" />}><Route index element={<AppointmentsPage />} /></Route>
                    <Route path="/roles" element={<PermissionRoute permission="role.read" />}><Route index element={<RolesPage />} /></Route>
                </Route>
            </Route>
            <Route path="*" element={<TenantUnknownRoute />} />
        </Routes>;
}
