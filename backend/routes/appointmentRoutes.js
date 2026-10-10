import express from "express";
import * as controller from "../controllers/Appointment/appointmentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const route = express.Router();

route.get(
    "/options",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.read"),
    controller.options,
);

route.get(
    "/",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.read"),
    controller.list,
);

route.get(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.read"),
    controller.show,
);

route.post(
    "/",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.create"),
    controller.create,
);

route.put(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.update"),
    controller.update,
);

route.delete(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.delete"),
    controller.destroy,
);

export default route;
