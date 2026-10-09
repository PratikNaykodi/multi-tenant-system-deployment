import * as service from "../../services/User/userService.js";

const actorRole = (user) => String(typeof user?.role === "object" ? user.role?.name : user?.role || "").toLowerCase();
const userId = (user) => Number(user?.userId ?? user?.id);
const targetRole = (record) => String(typeof record?.role === "object" ? record.role?.name : record?.role || "").toLowerCase();

function sendError(res, error) {
    const duplicate = error?.code === "P2002";
    const status = duplicate ? 409 : (error.statusCode || 500);
    const message = duplicate
    ? "This email address is already registered. Please use a different email address."
    : error.message;
    return res.status(status).json({ message });
}

export async function list(req, res) {
    try { return res.json({ users: await service.getUsers(req.tenantDb) }); }
    catch (error) { return sendError(res, error); }
}

export async function show(req, res) {
    try { return res.json({ user: await service.getUser(req.tenantDb, req.params.id) }); }
    catch (error) { return sendError(res, error); }
}

export async function create(req, res) {
    try {
        if (actorRole(req.user) === "manager") {
            const role = await req.tenantDb.role.findUnique({ where: { id: Number(req.body.role_id) } });
            if (!role || !["provider", "patient"].includes(String(role.name).toLowerCase())) {
                return res.status(403).json({ message: "Managers can create provider and patient users only." });
            }
        }
        const user = await service.createNewUser(req.tenantDb, req.body);
        return res.status(201).json({ message: "User created successfully", user });
    } catch (error) { return sendError(res, error); }
}

export async function update(req, res) {
    try {
        const id = Number(req.params.id);
        const actorId = userId(req.user);
        const isSelf = Number.isInteger(actorId) && actorId === id;
        const existing = await service.getUser(req.tenantDb, id);
        const targetRoleName = targetRole(existing);
        const actor = actorRole(req.user);
        
        if (actor === "manager" && !isSelf && !["provider", "patient"].includes(targetRoleName)) {
            return res.status(403).json({ message: "Managers can update provider and patient users only, apart from their own profile." });
        }
        
        // Never allow self-service profile edits to elevate or change the account's role.
        const input = isSelf
        ? { ...req.body, role_id: existing.roleId ?? existing.role_id ?? existing.role?.id }
        : req.body;
        const user = await service.updateExistingUser(req.tenantDb, id, input);
        return res.json({ message: "User updated successfully", user });
    } catch (error) { return sendError(res, error); }
}

export async function destroy(req, res) {
    try {
        const id = Number(req.params.id);
        if (id === userId(req.user)) {
            return res.status(400).json({ message: "You cannot delete your own account." });
        }
        if (actorRole(req.user) === "manager") {
            const target = await service.getUser(req.tenantDb, id);
            if (!["provider", "patient"].includes(targetRole(target))) {
                return res.status(403).json({ message: "Managers can delete provider and patient users only." });
            }
        }
        return res.json(await service.removeUser(req.tenantDb, id));
    } catch (error) { return sendError(res, error); }
}
