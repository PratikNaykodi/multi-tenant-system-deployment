import api from "../../../services/api";

export const login = async (email, password) => {
    const response = await api.post(
        "/auth/login",
        {
            email,
            password
        }
    );
    
    return response.data;
};