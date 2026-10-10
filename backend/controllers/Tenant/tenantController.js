import { createTenant } from "../../services/Tenant/tenantService.js";

export async function create(req, res) {
    try {
        return res.status(201).json(await createTenant(req.body));
    } catch (e) {
        console.error("Create tenant error:", e);
        return res.status(e.statusCode || 500).json({ message: e.message });
    }
}
