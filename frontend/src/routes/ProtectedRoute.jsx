import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
    const { user, loading } = useAuth();
    if (loading) return <div className="screen-loader">Checking your session...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return <Outlet />;
}
