import express from "express";
import * as controller from "../controllers/User/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";
import { requireUserUpdatePermission } from "../middleware/userUpdatePermission.js";

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

route.post(
    "/",
    authMiddleware,
    tenantMiddleware,
    requirePermission("user.create"),
    controller.create,
);

route.put(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requireUserUpdatePermission,
    controller.update,
);

route.delete(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requirePermission("user.delete"),
    controller.destroy,
);

export default route;
