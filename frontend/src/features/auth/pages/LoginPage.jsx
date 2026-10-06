import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../services/authService";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";

function LoginPage() {
    const navigate = useNavigate();
    const { loginUser } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        if (!email) {
            setError("Email field is required");
            return;
        }
        if (!password) {
            setError("Password field is required");
            return;
        }
        try {
            setLoading(true);
            const data = await login(email, password);
            toast.success("Login successful");
            console.log("Login successful:", data);

            // Save token, user and tenant
            loginUser(data);

            // Redirect to dashboard
            navigate("/dashboard", {replace: true});
        } catch (error) {
            console.error(
                "Login error:",
                error
            );
            const message =
                error.response?.data?.message ||
                "Invalid email or password";

            setError(message);

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Left Side */}
                <div className="login-brand">
                    <div className="brand-logo">MT</div>

                    <h1>MultiTenant</h1>
                    <p>Management Platform</p>

                    <div className="brand-description">
                        <h2>Manage your business in one place.</h2>
                        <p>
                            Secure multi-tenant management platform  with role-based access and tenant isolation.
                        </p>
                    </div>
                </div>

                {/* Right Side */}
                <div className="login-form-container">
                    <div className="login-form-wrapper">
                        <div className="login-header">
                            <h2>
                                Welcome back
                            </h2>
                            <p>
                                Sign in to your
                                workspace
                            </p>
                        </div>

                        {error && (
                            <div className="login-error">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label>
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter your email"
                                    autoComplete="email"
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                            </div>

                            <button type="submit" className="login-button" disabled={loading}>
                                {loading
                                    ? "Signing in..."
                                    : "Sign in"
                                }
                            </button>
                        </form>

                        <div className="login-footer">
                            <span>
                                Secure multi-tenant
                                authentication
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;