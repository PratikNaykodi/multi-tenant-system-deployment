// Allows a signed-in user to update their own profile even when their role does not have user.update.
// Updating other users still requires the normal user.update permission.
export function requireUserUpdatePermission(req, res, next) {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const actorId = Number(req.user.userId ?? req.user.id);
    const targetId = Number(req.params.id);
    if (Number.isInteger(actorId) && actorId > 0 && actorId === targetId) return next();
    const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    if (!permissions.includes("user.update")) {
        return res.status(403).json({ message: "Permission denied: user.update" });
    }
    return next();
}
