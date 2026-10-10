import * as repo from "../../repositories/Role/roleRepository.js";

const format = (r) => ({
    id: r.id,
    name: r.name,
    permissions: r.permissions.map((x) => x.permission.name),
});

export async function getRoles(db) {
    return (await repo.listRoles(db)).map(format);
}

export async function getRole(db, id) {
    const r = await repo.findRoleById(db, id);
    if (!r) throw Object.assign(new Error("Role not found"), { statusCode: 404 });
    return format(r);
}
