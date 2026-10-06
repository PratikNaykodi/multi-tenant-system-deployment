import express from "express";
import { createTenant, getTenants } from "../controllers/tenantController.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";

const router = express.Router();

// Central tenant APIs
router.post("/", createTenant);
router.get("/", getTenants);

// Test tenant database connection
router.get(
    "/test-connection",
    tenantMiddleware,
    async (req, res) => {
        try {
            const result = await req.tenantDb.query(
                "SELECT current_database() AS database"
            );

            return res.json({
                message: "Tenant database connection successful",

                tenant: {
                    id: req.tenant.id,
                    name: req.tenant.name,
                    identifier: req.tenant.identifier
                },
                database: result.rows[0].database
            });
        } catch (error) {
            console.error(
                "Tenant database test error:",
                error
            );
            return res.status(500).json({
                message: "Tenant database query failed",
                error: error.message
            });
        }
    }
);

export default router;