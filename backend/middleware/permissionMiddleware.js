import { createAbility } from "../services/authorizationService.js";

// --------------------------------------------------
// Require Permission
// --------------------------------------------------
export const requirePermission = (
    action,
    resource
) => {
    return async (req, res, next) => {
        try {
            // -----------------------------------------
            // Check authentication
            // -----------------------------------------
            if (!req.user) {
                return res.status(401).json({
                    message: "Authentication required"
                });
            }

            // -----------------------------------------
            // Get user's permissions from database
            // -----------------------------------------
            const result = await req.tenantDb.query(
                `
                SELECT
                    p.id,
                    p.name
                FROM role_permissions rp

                INNER JOIN permissions p
                    ON p.id = rp.permission_id

                WHERE rp.role_id = $1
                `,
                [req.user.role_id]
            );

            const permissions = result.rows;

            // -----------------------------------------
            // Create CASL ability
            // -----------------------------------------
            const userAbility = createAbility(
                permissions
            );

            // -----------------------------------------
            // Check permission
            // -----------------------------------------
            const hasPermission =
                userAbility.can(
                    action,
                    resource
                );

            console.log("User:", req.user);
            console.log("Requested permission:", `${action}.${resource}`);
            console.log("Database permissions:", permissions);
            console.log("CASL permission:", hasPermission);

            // -----------------------------------------
            // Permission denied
            // -----------------------------------------
            if (!hasPermission) {
                return res.status(403).json({
                    message: "You do not have permission to perform this action"
                });
            }

            // -----------------------------------------
            // Store ability in request
            // -----------------------------------------
            req.ability = userAbility;

            next();
        } catch (error) {
            console.error("Permission middleware error:", error);

            return res.status(500).json({
                message: "Permission check failed",
                error: error.message
            });
        }
    };
};