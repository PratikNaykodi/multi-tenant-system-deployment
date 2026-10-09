import axios from "axios";
const centralApi = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
    headers: { "Content-Type": "application/json" },
});
export const tenantApi = {
    create: (data) => centralApi.post("/tenants", data),
};
