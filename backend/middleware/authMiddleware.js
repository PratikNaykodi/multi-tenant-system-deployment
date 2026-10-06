import jwt from "jsonwebtoken";
import prisma from "../config/centralDatabase.js";
import { getTenantDatabase } from "../config/tenantDatabase.js";

export const authMiddleware = async (req, res, next) => {
    try {
        // --------------------------------------------
        // 1. Get Authorization header
        // --------------------------------------------
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Authorization header is required"
            });
        }

        // Expected:
        // Bearer eyJhbGciOiJIUzI1Ni...
        const parts = authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer"
        ) {
            return res.status(401).json({
                message: "Invalid authorization format"
            });
        }

        const token = parts[1];

        // --------------------------------------------
        // 2. Verify JWT
        // --------------------------------------------
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // --------------------------------------------
        // 3. Check token data
        // --------------------------------------------
        if (
            !decoded.userId ||
            !decoded.tenantId
        ) {
            return res.status(401).json({
                message: "Invalid token data"
            });
        }

        // --------------------------------------------
        // 4. Find tenant in central database
        // --------------------------------------------
        const tenant = await prisma.tenant.findUnique({
            where: {
                identifier: decoded.tenantId
            }
        });

        if (!tenant) {
            return res.status(401).json({
                message: "Tenant not found"
            });
        }

        // --------------------------------------------
        // 5. Get tenant database
        // --------------------------------------------
        const tenantDb = getTenantDatabase(
            tenant.databaseName
        );

        // --------------------------------------------
        // 6. Find user in tenant database
        // --------------------------------------------
        const result = await tenantDb.query(
            `
            SELECT
                id,
                name,
                email,
                role_id
            FROM users
            WHERE id = $1
            `,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        // --------------------------------------------
        // 7. Attach data to request
        // --------------------------------------------
        req.user = result.rows[0];
        req.tenant = tenant;
        req.tenantDb = tenantDb;

        // Continue to controller
        next();
    } catch (error) {
        console.error("Authentication error:", error.message);

        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired token"
            });
        }
        
        return res.status(500).json({
            message: "Authentication failed",
            error: error.message
        });
    }
};