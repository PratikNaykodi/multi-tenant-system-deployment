import {createContext, useContext, useState} from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");

        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [tenant, setTenant] = useState(() => {
        const savedTenant = localStorage.getItem("tenant");

        return savedTenant ? JSON.parse(savedTenant) : null;
    });

    const [token, setToken] = useState(() => {
        return localStorage.getItem("token");
    });

    const loginUser = (loginData) => {
        localStorage.setItem("token", loginData.token);

        localStorage.setItem("user", JSON.stringify(loginData.user));

        localStorage.setItem("tenant", JSON.stringify(loginData.tenant));

        setToken(loginData.token);
        setUser(loginData.user);
        setTenant(loginData.tenant);
    };

    const logoutUser = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tenant");
        
        setToken(null);
        setUser(null);
        setTenant(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                tenant,
                token,
                loginUser,
                logoutUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};