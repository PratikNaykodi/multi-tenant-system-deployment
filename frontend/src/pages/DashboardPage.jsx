import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getCurrentUser } from "../features/users/services/userService";

function DashboardPage() {
    const { user, tenant } = useAuth();

    useEffect(() => {
        const loadUser = async () => {
            try {
                const data = await getCurrentUser();
                console.log("Current user:", data);
            } catch (error) {
                console.error("Current user error:", error);
            }
        };

        loadUser();
    }, []);

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Welcome back, {user?.name}</p>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-card">
                    <div className="card-icon">
                        👤
                    </div>
                    <div>
                        <p className="card-label">
                            User
                        </p>
                        <h2>
                            {user?.name}
                        </h2>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-icon">
                        🏢
                    </div>
                    <div>
                        <p className="card-label">
                            Company
                        </p>
                        <h2>
                            {tenant?.name}
                        </h2>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-icon">
                        🔐
                    </div>
                    <div>
                        <p className="card-label">
                            Role
                        </p>
                        <h2>
                            {user?.role}
                        </h2>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-icon">
                        🌐
                    </div>
                    <div>
                        <p className="card-label">
                            Tenant
                        </p>
                        <h2>
                            {tenant?.identifier}
                        </h2>
                    </div>
                </div>
            </div>

            <div className="welcome-card">
                <h2>
                    Welcome to your workspace
                </h2>
                <p>
                    You are logged into the{" "}
                    <strong>
                        {tenant?.name}
                    </strong>.
                </p>
                <p>
                    Your current role is{" "}
                    <strong>
                        {user?.role}
                    </strong>.
                </p>
            </div>
        </div>
    );
}

export default DashboardPage;