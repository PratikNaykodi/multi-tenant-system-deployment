import axios from "axios";
import { getTenantIdentifier } from "../utils/tenant";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
});

/*
|--------------------------------------------------------------------------
| Request Interceptor
|--------------------------------------------------------------------------
| Automatically sends:
| 1. Tenant identifier
| 2. JWT token
|--------------------------------------------------------------------------
*/

api.interceptors.request.use(
    (config) => {

        const tenantIdentifier =
            getTenantIdentifier();

        config.headers["x-tenant-id"] =
            tenantIdentifier;

        const token =
            localStorage.getItem("token");

        if (token) {
            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


/*
|--------------------------------------------------------------------------
| Response Interceptor
|--------------------------------------------------------------------------
| Login 401:
| Show error on login page.
|
| Other authenticated API 401:
| Clear authentication and redirect to login.
|--------------------------------------------------------------------------
*/

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {

        const status =
            error.response?.status;

        const requestUrl =
            error.config?.url || "";

        const isLoginRequest =
            requestUrl.split("?")[0].replace(/\/$/, "")
                .endsWith("/auth/login");

        // Invalid email/password:
        // Let LoginPage handle the error.
        if (
            status === 401 &&
            isLoginRequest
        ) {
            return Promise.reject(error);
        }

        // Expired or invalid JWT
        if (status === 401) {

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("tenant");

            // Avoid reloading if already on login page
            if (
                window.location.pathname !== "/login"
            ) {
                window.location.replace("/login");
            }
        }

        return Promise.reject(error);
    }
);

export default api;