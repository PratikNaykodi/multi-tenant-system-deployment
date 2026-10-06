import {NavLink} from "react-router-dom";
import {useAuth} from "../../context/AuthContext";
import {hasPermission} from "../../utils/permission";

function Sidebar() {
    const { user } = useAuth();
    const canViewUsers = hasPermission(user,"user.read");

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">MT</div>
                <div>
                    <h2>MultiTenant</h2>
                    <span>Management</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <p className="nav-section">MAIN</p>
                <NavLink to="/dashboard" className="nav-link">
                    <span>📊</span>Dashboard
                </NavLink>

                <p className="nav-section">MANAGEMENT</p>

                {/* Users */}
                {canViewUsers && (
                    <NavLink to="/users" className="nav-link">
                        <span>👥</span>Users
                    </NavLink>
                )}

                {hasPermission(
                    user,
                    "appointment.read"
                ) && (
                    <NavLink
                        to="/appointments"
                        className="nav-link"
                    >
                        <span>📅</span>
                        <span>Appointments</span>
                    </NavLink>
                )}

                <p className="nav-section">ACCOUNT</p>

                <NavLink to="/profile" className="nav-link">
                    <span>👤</span>Profile
                </NavLink>
            </nav>

            <div className="sidebar-user">
                <div className="avatar">{user?.name?.charAt(0)}</div>
                <div>
                    <strong>{user?.name}</strong>
                    <span>{user?.role}</span>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;