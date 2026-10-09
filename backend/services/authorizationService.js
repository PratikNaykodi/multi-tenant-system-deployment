export function getPermissionNames(user) {
    return (user?.role?.permissions || []).map((x) => x.permission.name);
}
export function hasPermission(user, name) {
    return getPermissionNames(user).includes(name);
}
