import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";

export default function PermissionRoute({ permission }) {
    const { hasPermission } = useAuth();
    return hasPermission(permission) ? <Outlet /> : <Navigate to="/403" replace />;
}
