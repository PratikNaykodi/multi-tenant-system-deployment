import express from "express";
import * as c from "../controllers/Role/roleController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";
const r = express.Router();
r.get(
    "/",
    authMiddleware,
    tenantMiddleware,
    requirePermission("user.read"),
    c.list,
);
r.get(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requirePermission("user.read"),
    c.show,
);
export default r;
