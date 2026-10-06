import axios from "axios";

const centralApi = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
});

export const createTenant = async (tenantData) => {
    const response =
        await centralApi.post(
            "/tenants",
            tenantData
        );
    return response.data;
};