export const listRoles = (db) =>
    db.role.findMany({
    orderBy: { id: "asc" },
    include: { permissions: { include: { permission: true } } },
});
export const findRoleById = (db, id) =>
    db.role.findUnique({
    where: { id: Number(id) },
    include: { permissions: { include: { permission: true } } },
});
