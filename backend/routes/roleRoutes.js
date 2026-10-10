import express from "express";
import * as controller from "../controllers/Role/roleController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const route = express.Router();
route.get(
    "/",
    authMiddleware,
    tenantMiddleware,
    requirePermission("user.read"),
    controller.list,
);

route.get(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requirePermission("user.read"),
    controller.show,
);

export default route;
