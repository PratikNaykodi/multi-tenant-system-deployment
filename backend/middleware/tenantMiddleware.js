import prisma from "../config/centralDatabase.js";
import { getTenantDatabase } from "../config/tenantDatabase.js";

export const tenantMiddleware = async (req, res, next) => {
    try {
        // Get tenant identifier from request header
        const tenantIdentifier = req.headers["x-tenant-id"];

        // Check tenant identifier
        if (!tenantIdentifier) {
            return res.status(400).json({
                message: "x-tenant-id header is required"
            });
        }

        // Find tenant in central database
        const tenant = await prisma.tenant.findUnique({
            where: {
                identifier: tenantIdentifier
            }
        });

        // Tenant does not exist
        if (!tenant) {
            return res.status(404).json({
                message: "Tenant not found"
            });
        }

        // Create/get tenant database connection
        const tenantDb = getTenantDatabase(tenant.databaseName);

        // Store tenant information in request
        req.tenant = tenant;
        req.tenantDb = tenantDb;

        next();
    } catch (error) {
        console.error("Tenant middleware error:", error);

        return res.status(500).json({
            message: "Tenant connection error",
            error: error.message
        });
    }
};