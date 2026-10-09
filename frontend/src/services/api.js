import axios from "axios";
import { getTenantIdentifier } from "../utils/tenant.js";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
    headers: { "Content-Type": "application/json" },
});

// Add authentication and tenant information to every tenant API request.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    const tenantId = getTenantIdentifier();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (tenantId) config.headers["x-tenant-id"] = tenantId;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("tenant_id");
        }
        return Promise.reject(error);
    },
);

export default api;
