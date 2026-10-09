import express from "express";
import * as c from "../controllers/User/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";
import { requireUserUpdatePermission } from "../middleware/userUpdatePermission.js";

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
r.post(
    "/",
    authMiddleware,
    tenantMiddleware,
    requirePermission("user.create"),
    c.create,
);
r.put(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requireUserUpdatePermission,
    c.update,
);
r.delete(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requirePermission("user.delete"),
    c.destroy,
);
export default r;
