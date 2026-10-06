import {useNavigate} from "react-router-dom";
import {useAuth} from "../../context/AuthContext";
import { toast } from "react-toastify";

function Header() {
    const {user, tenant, logoutUser} = useAuth();

    const navigate = useNavigate();

    const handleLogout = () => {
        logoutUser();
        toast.success("Logout successful");
        navigate("/login",{replace: true});
    };

    return (
        <header className="header">
            <div className="header-title">
                <h2>
                    {tenant?.name}
                </h2>
                <span>
                    Tenant: {tenant?.identifier}
                </span>
            </div>

            <div className="header-actions">
                <div className="user-info">
                    <div className="header-avatar">{user?.name?.charAt(0)}</div>
                    <div>
                        <strong>{user?.name}</strong>
                        <span>{user?.role}</span>
                    </div>
                </div>

                <button className="logout-button" onClick={handleLogout}>Logout</button>
            </div>
        </header>
    );
}

export default Header;