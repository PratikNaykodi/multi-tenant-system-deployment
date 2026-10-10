import { useState } from "react";
import { useNavigate } from "react-router";
import { getTenantIdentifier } from "../../../utils/tenant.js";
import { getApiError } from "../../../utils/errors.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { notify } from "../../../utils/notify.js";

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const tenant = getTenantIdentifier();

  async function submit(event) {
        event.preventDefault();
        setError(""); setBusy(true);
        try { await login(email, password); notify.success("Login successful"); navigate("/dashboard", { replace: true }); }
        catch (e) { setError(getApiError(e)); notify.error(getApiError(e)); }
        finally { setBusy(false); }
  }

  return <div className="login-page">
            <div className="login-card">
                <div className="login-logo">MT</div>
                <h1>Welcome back</h1>
                <p>Sign in to <strong>{tenant}</strong> tenant management</p>
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={submit}>
                    <label>Email</label>
                    <input className="form-control" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Enter email" required />
                    <label>Password</label>
                    <input className="form-control" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter password" required />
                    <button className="primary-btn w-100 mt-3" disabled={busy}>{busy ? "Signing in..." : "Login"}</button>
                </form>
            </div>
    </div>;
}
