import express from "express";
import * as c from "../controllers/Appointment/appointmentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";
const r = express.Router();
r.get(
    "/options",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.read"),
    c.options,
);
r.get(
    "/",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.read"),
    c.list,
);
r.get(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.read"),
    c.show,
);
r.post(
    "/",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.create"),
    c.create,
);
r.put(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.update"),
    c.update,
);
r.delete(
    "/:id",
    authMiddleware,
    tenantMiddleware,
    requirePermission("appointment.delete"),
    c.destroy,
);
export default r;
