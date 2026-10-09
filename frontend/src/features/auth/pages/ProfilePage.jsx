import PageHeader from "../../../components/PageHeader.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import { getTenantIdentifier } from "../../../utils/tenant.js";

export default function ProfilePage() {
    const { user } = useAuth();
    const role = typeof user?.role === "object" ? user?.role?.name : user?.role;
    return (
        <>
            <PageHeader
                title="Profile"
                description="Your tenant account information"
            />
            <div className="profile-card">
                <div className="profile-avatar">
                    {(user?.name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="profile-details">
                    <h3>{user?.name || "User"}</h3>
                    <span className="role-pill">{role || "User"}</span>
                    <dl>
                        <dt>Email</dt>
                        <dd>{user?.email || "-"}</dd>
                        <dt>User ID</dt>
                        <dd>{user?.id || "-"}</dd>
                        <dt>Role ID</dt>
                        <dd>{user?.role_id ?? user?.roleId ?? user?.role?.id ?? "-"}</dd>
                        <dt>Tenant</dt>
                        <dd>{getTenantIdentifier()}</dd>
                    </dl>
                </div>
            </div>
        </>
    );
}
