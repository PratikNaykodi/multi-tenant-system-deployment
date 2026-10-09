import { useEffect, useState } from "react";
import PageHeader from "../../../components/PageHeader.jsx";
import { usersApi, appointmentsApi } from "../../../services/crud.js";
import { getApiError } from "../../../utils/errors.js";
import { useAuth } from "../../../context/AuthContext.jsx";

function unwrapList(response, keys) {
    let body = response?.data;
    // Walk through common API envelopes until a list is found.
    for (let i = 0; i < 5 && body && !Array.isArray(body); i += 1) {
        const list = keys.map((key) => body?.[key]).find((value) => Array.isArray(value));
        if (list) return list;
        if (body.data !== undefined) body = body.data;
        else if (body.result !== undefined) body = body.result;
        else break;
    }
    return Array.isArray(body) ? body : [];
}

function readTotal(response, listKeys) {
    const body = response?.data;
    const candidates = [
        body?.pagination?.total,
        body?.meta?.total,
        body?.total,
        body?.data?.pagination?.total,
        body?.data?.meta?.total,
        body?.data?.total,
        body?.pagination?.totalItems,
        body?.data?.pagination?.totalItems,
    ];
    const total = candidates.find((value) => value !== undefined && value !== null && Number.isFinite(Number(value)));
    if (total !== undefined) return Number(total);
    return unwrapList(response, listKeys).length;
}

function roleNameOf(user) {
    const role = user?.role || user?.role_name || user?.roleName;
    return String(typeof role === "object" ? role?.name || role?.role_name || "" : role || "").trim().toLowerCase();
}

export default function DashboardPage() {
    const { user, hasPermission } = useAuth();
    const [stats, setStats] = useState({ users: 0, appointments: 0 });
    const [error, setError] = useState("");
    const role = roleNameOf(user);
    
    useEffect(() => {
        let active = true;
        setError("");
        const calls = [];
        if (hasPermission("user.read")) {
            calls.push(usersApi.list().then((response) => {
                const users = unwrapList(response, ["users", "data", "items", "results"]);
                const count = role === "manager"
                ? users.filter((item) => ["provider", "patient"].includes(roleNameOf(item))).length
                : readTotal(response, ["users", "items", "results"]);
                return { key: "users", value: count };
            }));
        }
        if (hasPermission("appointment.read")) {
            calls.push(appointmentsApi.list(1, 1000).then((response) => ({
                key: "appointments",
                value: readTotal(response, ["appointments", "items", "results"]),
            })));
        }
        Promise.all(calls)
        .then((rows) => { if (active) setStats((current) => rows.reduce((next, row) => ({ ...next, [row.key]: row.value }), current)); })
            .catch((e) => { if (active) setError(getApiError(e)); });
        return () => { active = false; };
    }, [hasPermission, role]);
    
    return <>
    <PageHeader title="Dashboard" description="Overview of your tenant application" />
    {error && <div className="alert alert-warning">{error}</div>}
    <div className="stat-grid">
    {hasPermission("user.read") && <Stat title={role === "manager" ? "Providers & Patients" : "Users"} value={stats.users} icon="♟" />}
    {hasPermission("appointment.read") && <Stat title="Appointments" value={stats.appointments} icon="▦" />}
    <Stat title="Role" value={role || "User"} icon="◆" />
    </div>
    <div className="welcome-card"><div><h3>Welcome, {user?.name || "User"}</h3><p>Your tenant is <strong>{window.location.hostname}</strong>. Use the menu on the left to manage your application.</p></div><div className="welcome-mark">{(user?.name || "U").charAt(0).toUpperCase()}</div></div>
    </>;
}
function Stat({ title, value, icon }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><div><small>{title}</small><strong>{value}</strong></div></div>; }
