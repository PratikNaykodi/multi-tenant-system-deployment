import { Fragment, useEffect, useState } from "react";
import { rolesApi } from "../../../services/crud.js";
import { getApiError } from "../../../utils/errors.js";
import { notify } from "../../../utils/notify.js";
import PageHeader from "../../../components/PageHeader.jsx";

// The list endpoint may return roles only. Load each role's details when expanded
// so the page can show the permissions assigned to that specific role.
function unwrapRole(response) {
    let body = response?.data;
    for (let i = 0; i < 3 && body && !body.role && !body.permissions && !body.rolePermissions && !body.role_permissions; i += 1) {
        if (body.data !== undefined) body = body.data;
        else break;
    }
    return body?.role || body?.data?.role || body;
}

function permissionNames(role) {
    const relations = role?.permissions || role?.rolePermissions || role?.role_permissions || role?.permission || [];
    const rows = Array.isArray(relations) ? relations : Object.values(relations || {});
    return [...new Set(rows.map((entry) => {
        if (typeof entry === "string") return entry;
        const permission = entry?.permission || entry?.Permission || entry?.permissions;
        const name = permission?.name || permission?.permission_name || entry?.permission_name || entry?.permissionName || entry?.name || entry?.key;
        return name ? String(name) : null;
    }).filter(Boolean))].sort();
}

export default function RolesPage() {
    const [roles, setRoles] = useState([]);
    const [expanded, setExpanded] = useState(null);
    const [details, setDetails] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingRole, setLoadingRole] = useState(null);
    const [error, setError] = useState("");
    
    useEffect(() => {
        let active = true;
        rolesApi.list()
        .then((response) => {
            let body = response?.data;
            for (let i = 0; i < 3 && body && !Array.isArray(body); i += 1) {
                if (Array.isArray(body.roles)) { body = body.roles; break; }
                if (body.data !== undefined) body = body.data;
                else break;
            }
            if (active) setRoles(Array.isArray(body) ? body : []);
        })
        .catch((e) => { if (active) setError(getApiError(e)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);
    
    async function toggleRole(role) {
        if (expanded === role.id) {
            setExpanded(null);
            return;
        }
        setExpanded(role.id);
        if (details[role.id]) return;
        setLoadingRole(role.id);
        try {
            const response = await rolesApi.get(role.id);
            const fullRole = unwrapRole(response);
            setDetails((current) => ({ ...current, [role.id]: fullRole || role }));
        } catch (e) {
            // Some list APIs already include permissions; use those if the detail route fails.
            setDetails((current) => ({ ...current, [role.id]: role }));
            notify.error(`Could not load permissions for ${role.name}: ${getApiError(e)}`);
        } finally {
            setLoadingRole(null);
        }
    }
    
    return (
        <>
            <PageHeader title="Roles & Permissions" description="Review permissions assigned to each tenant role" />
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <div className="data-card">
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>ID</th><th>Role</th><th>Created</th><th>Permissions</th><th>Action</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan="5" className="empty-cell">Loading roles...</td></tr> :
                            roles.length === 0 ? <tr><td colSpan="5" className="empty-cell">No roles found.</td></tr> :
                            roles.map((role) => {
                                const detail = details[role.id] || role;
                                const names = permissionNames(detail);
                                const isOpen = expanded === role.id;
                                return (
                                    <Fragment key={role.id}>
                                        <tr>
                                            <td>{role.id}</td>
                                            <td><span className="role-pill">{role.name}</span></td>
                                            <td>{role.createdAt ? new Date(role.createdAt).toLocaleString() : role.created_at ? new Date(role.created_at).toLocaleString() : "-"}</td>
                                            <td>{names.length ? `${names.length} permission(s)` : "Not loaded"}</td>
                                            <td><button className="outline-btn" type="button" onClick={() => toggleRole(role)}>{isOpen ? "Hide permissions" : "View permissions"}</button></td>
                                        </tr>
                                        {isOpen && <tr key={`${role.id}-permissions`}>
                                            <td colSpan="5">
                                                <div className="role-permissions-panel">
                                                <strong>{role.name} permissions</strong>
                                                {loadingRole === role.id ? <p>Loading permissions...</p> : names.length ?
                                                    <div className="permission-chip-list">{names.map((name) => <span className="permission-chip" key={name}>{name}</span>)}</div> :
                                                    <p>No permission relations were returned for this role. Check that GET /api/roles/:id includes role permissions.</p>}
                                                    </div>
                                            </td>
                                        </tr>}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="table-footer">Showing {roles.length} role(s)</div>
                </div>
            </>
        );
    }
        