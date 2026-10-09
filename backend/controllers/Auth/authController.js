import * as service from "../../services/Auth/authService.js";

export async function register(req, res) {
    try {
        const user = await service.registerUser(req.tenantDb, req.body);
        return res.status(201).json({
            message: "User registered successfully",
            user: { id: user.id, name: user.name, email: user.email, role_id: user.roleId, role: user.role.name },
            tenant: { id: req.tenant.id, name: req.tenant.name, identifier: req.tenant.identifier },
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Unable to register user" });
    }
}

export async function login(req, res) {
    try {
        return res.json(await service.loginUser(req.tenantDb, req.tenant, req.body.email, req.body.password));
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Unable to log in" });
    }
}

export async function me(req, res) {
    try {
        const user = await service.getCurrentUser(req.tenantDb, req.user?.userId ?? req.user?.id);
        if (!user) return res.status(401).json({ message: "User account no longer exists" });
        return res.json({ user, tenant: { id: req.tenant.id, name: req.tenant.name, identifier: req.tenant.identifier } });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ message: error.message || "Unable to load current user" });
    }
}
