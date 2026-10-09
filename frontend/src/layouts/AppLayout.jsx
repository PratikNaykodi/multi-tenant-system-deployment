import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { getTenantIdentifier } from "../utils/tenant.js";
import { connectSocket } from "../services/socket.js";
import { notify } from "../utils/notify.js";

const menu = [
    { path: "/dashboard", label: "Dashboard", icon: "▥" },
    { path: "/users", label: "Users", icon: "♟", permission: "user.read" },
    { path: "/appointments", label: "Appointments", icon: "▦", permission: "appointment.read" },
    { path: "/roles", label: "Roles", icon: "◆", permission: "role.read" },
];

export default function AppLayout() {
    const { user, logout, hasPermission } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

  useEffect(() => {
    const socket = connectSocket();
    const providerId = user?.provider?.id;
    if (providerId) socket.emit("join_provider_room", { tenantId: getTenantIdentifier(), providerId });
    return () => { socket.off("appointment_created"); };
}, [user]);

    function signOut() { logout(); notify.success("Logout successful"); navigate("/login", { replace: true }); }
    const roleName = typeof user?.role === "object" ? user?.role?.name : user?.role;

  return <div className="app-shell">
        <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
            <div className="brand">
                <div className="brand-mark">MT</div>
                <div><strong>MultiTenant</strong><small>Management</small></div>
            </div>
            <div className="sidebar-section">MAIN</div>
            <nav>{menu.filter((x) => !x.permission || hasPermission(x.permission)).map((item) => (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => `side-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
                    <span className="side-icon">{item.icon}</span>{item.label}
                </NavLink>
                ))}
            </nav>
            <div className="sidebar-section">ACCOUNT</div>
            <NavLink to="/profile" className={({ isActive }) => `side-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
                <span className="side-icon">♟</span>Profile
            </NavLink>
            <div className="sidebar-user">
                <div className="avatar small">{(user?.name || "U").charAt(0).toUpperCase()}</div>
                <div><strong>{user?.name || "User"}</strong><small>{roleName || user?.email || ""}</small></div>
            </div>  
        </aside>
    {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
        <section className="app-content">
            <header className="topbar">
                <button className="mobile-menu" onClick={() => setMobileOpen(true)}>☰</button>
                <div><h2>{user?.tenantName || `${getTenantIdentifier() || "Tenant"} Clinics`}</h2>
                    <span>Tenant: {getTenantIdentifier()}</span>
                </div>
                <div className="top-user">
                    <div className="avatar">{(user?.name || "U").charAt(0).toUpperCase()}</div>
                    <div className="top-user-name"><strong>{user?.name || "User"}</strong><small>{roleName || ""}</small></div>
                    <button className="logout-btn" onClick={signOut}>Logout</button>
                </div>
            </header>
            <main className="content-area"><Outlet /></main>
        </section>
    </div>;
}
