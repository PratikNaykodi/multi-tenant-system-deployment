import * as service from "../../services/Role/roleService.js";

export async function list(req, res) {
    try {
        return res.json({ roles: await service.getRoles(req.tenantDb) });
    } catch (e) {
        return res.status(e.statusCode || 500).json({ message: e.message });
    }
}

export async function show(req, res) {
    try {
        return res.json({
            role: await service.getRole(req.tenantDb, req.params.id),
        });
    } catch (e) {
        return res.status(e.statusCode || 500).json({ message: e.message });
    }
}
