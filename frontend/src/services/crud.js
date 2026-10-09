import api from "./api.js";

export const usersApi = {
    list: () => api.get("/users"),
    get: (id) => api.get(`/users/${id}`),
    create: (data) => api.post("/users", data),
    update: (id, data) => api.put(`/users/${id}`, data),
    remove: (id) => api.delete(`/users/${id}`),
};
export const rolesApi = {
    list: () => api.get("/roles"),
    get: (id) => api.get(`/roles/${id}`),
};
export const appointmentsApi = {
    options: () => api.get("/appointments/options"),
    list: (page = 1, limit = 10) => api.get(`/appointments?page=${page}&limit=${limit}`),
    get: (id) => api.get(`/appointments/${id}`),
    create: (data) => api.post("/appointments", data),
    update: (id, data) => api.put(`/appointments/${id}`, data),
    remove: (id) => api.delete(`/appointments/${id}`),
};
