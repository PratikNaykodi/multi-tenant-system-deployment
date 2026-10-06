import express from "express";

import {
    createAppointment,
    getAppointments,
    getAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentOptions
} from "../controllers/appointmentController.js";

import {
    tenantMiddleware
} from "../middleware/tenantMiddleware.js";

import {
    authMiddleware
} from "../middleware/authMiddleware.js";

import {
    requirePermission
} from "../middleware/permissionMiddleware.js";

const router = express.Router();

// ==================================================
// GET ALL
// Admin / Manager / Provider
// ==================================================
router.get(
    "/",
    tenantMiddleware,
    authMiddleware,
    requirePermission(
        "read",
        "appointment"
    ),
    getAppointments
);

// ==================================================
// APPOINTMENT OPTIONS
// ==================================================
router.get(
    "/options",
    tenantMiddleware,
    authMiddleware,
    requirePermission(
        "read",
        "appointment"
    ),
    getAppointmentOptions
);

// ==================================================
// GET SINGLE
// ==================================================
router.get(
    "/:id",
    tenantMiddleware,
    authMiddleware,
    requirePermission(
        "read",
        "appointment"
    ),
    getAppointment
);


// ==================================================
// CREATE
// Admin / Manager / Provider
// ==================================================
router.post(
    "/",
    tenantMiddleware,
    authMiddleware,
    requirePermission(
        "create",
        "appointment"
    ),
    createAppointment
);


// ==================================================
// UPDATE
// Admin / Manager / Provider
// ==================================================
router.put(
    "/:id",
    tenantMiddleware,
    authMiddleware,
    requirePermission(
        "update",
        "appointment"
    ),
    updateAppointment
);


// ==================================================
// DELETE
// Admin / Manager only
// Provider has no delete permission
// ==================================================
router.delete(
    "/:id",
    tenantMiddleware,
    authMiddleware,
    requirePermission(
        "delete",
        "appointment"
    ),
    deleteAppointment
);

export default router;