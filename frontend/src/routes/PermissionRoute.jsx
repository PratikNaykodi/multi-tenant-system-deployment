import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permission";

function PermissionRoute({children, permission}) {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) {
        return null;
    }

    const allowed = hasPermission(user, permission);

    if (!allowed) {
        return (
            <div className="permission-denied">
                <div className="permission-denied-card">
                    <div className="permission-icon">
                        🔒
                    </div>
                    <h1>Access Denied</h1>
                    <p>
                        You don't have permission
                        to access this page.
                    </p>
                    <button
                        onClick={() =>
                            navigate("/dashboard")
                        }
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return children;
}

export default PermissionRoute;