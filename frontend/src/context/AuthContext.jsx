import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../features/auth/services/authService.js";
import { isCentralHost, getTenantIdentifier } from "../utils/tenant.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    });
    const [loading, setLoading] = useState(Boolean(localStorage.getItem("token")) && !isCentralHost());
    
    useEffect(() => {
        // The central application never uses tenant authentication.
        if (isCentralHost() || !localStorage.getItem("token")) {
            setLoading(false);
            return;
        }
        authApi.me()
        .then((res) => {
            const current = res.data?.user || res.data;
            setUser(current);
            localStorage.setItem("user", JSON.stringify(current));
            localStorage.setItem("tenant_id", getTenantIdentifier());
        })
        .catch((error) => {
            // Only clear the session when the API explicitly rejects the token.
            // A 404, network outage, or temporary server error must not log the user out.
            if (error?.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("tenant_id");
                setUser(null);
            } else {
                try {
                    const cachedUser = JSON.parse(localStorage.getItem("user") || "null");
                    if (cachedUser) setUser(cachedUser);
                } catch {
                    setUser(null);
                }
                console.error("Could not refresh the current user from /api/auth/me:", error?.message || error);
            }
        })
        .finally(() => setLoading(false));
    }, []);
    
    async function login(email, password) {
        const response = await authApi.login(email, password);
        const token = response.data?.token || response.data?.accessToken;
        let loggedUser = response.data?.user || response.data?.data?.user;
        if (!token) throw new Error("Login succeeded but API did not return a token.");
        const tenantId = getTenantIdentifier();
        localStorage.setItem("token", token);
        localStorage.setItem("tenant_id", tenantId);
        if (!loggedUser) {
            const me = await authApi.me();
            loggedUser = me.data?.user || me.data;
        }
        localStorage.setItem("user", JSON.stringify(loggedUser || {}));
        setUser(loggedUser || {});
        return loggedUser;
    }
    
    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tenant_id");
        setUser(null);
    }
    
    function hasPermission(permission) {
        const roleValue = typeof user?.role === "object" ? user?.role?.name : user?.role;
        const roleName = String(roleValue || user?.role_name || user?.roleName || "").trim().toLowerCase();
        
        // Keep the core appointment workflow available to the roles that need it.
        // API permissions must also be granted in each tenant database (see docs/sql).
        if (roleName === "admin") return true;
        
        // Managers must be able to open the Users module even when the API's
        // /auth/me response does not include user.* permission relations.
        // UsersPage separately limits manager actions/targets to provider and patient.
        if (roleName === "manager" && permission.startsWith("user.")) {
            return ["user.read", "user.create", "user.update", "user.delete"].includes(permission);
        }
        
        if (permission.startsWith("appointment.")) {
            if (["provider", "patient"].includes(roleName)) {
                return ["appointment.read", "appointment.create", "appointment.update"].includes(permission);
            }
            if (roleName === "manager") {
                return ["appointment.read", "appointment.create", "appointment.update", "appointment.delete"].includes(permission);
            }
        }
        
        const permissions = user?.permissions || user?.role?.permissions || [];
        return Array.isArray(permissions) && permissions.some((item) => {
            const name = item?.permission?.name || item?.permissionName || item?.name;
            return name === permission;
        });
    }
    
    const value = useMemo(() => ({ user, loading, login, logout, hasPermission }), [user, loading]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
