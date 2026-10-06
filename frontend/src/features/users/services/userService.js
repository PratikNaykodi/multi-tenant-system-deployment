import api from "../../../services/api";

/*
|--------------------------------------------------------------------------
| Get Current User
|--------------------------------------------------------------------------
*/
export const getCurrentUser = async () => {
    const response = await api.get("/users/me");

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Get All Users
|--------------------------------------------------------------------------
*/
export const getUsers = async (page = 1, limit = 10) => {
    const response = await api.get(
        `/users?page=${page}&limit=${limit}`
    );

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Get Single User
|--------------------------------------------------------------------------
*/
export const getUser = async (id) => {
    const response = await api.get(`/users/${id}`);
    
    return response.data;
};

/*
|--------------------------------------------------------------------------
| Create User
|--------------------------------------------------------------------------
*/
export const createUser = async (userData) => {
    const response = await api.post("/users", userData);

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Update User
|--------------------------------------------------------------------------
*/
export const updateUser = async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);

    return response.data;
};

/*
|--------------------------------------------------------------------------
| Delete User
|--------------------------------------------------------------------------
*/
export const deleteUser = async (id) => {
    const response = await api.delete(`/users/${id}`);

    return response.data;
};