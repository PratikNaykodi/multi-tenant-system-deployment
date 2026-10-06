import express from "express";

import {
    createEmployee,
    getEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee
} from "../controllers/employeeController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    requirePermission("create", "employee"),
    createEmployee
);

router.get(
    "/",
    authMiddleware,
    requirePermission("read", "employee"),
    getEmployees
);

router.get(
    "/:id",
    authMiddleware,
    requirePermission("read", "employee"),
    getEmployee
);

router.put(
    "/:id",
    authMiddleware,
    requirePermission("update", "employee"),
    updateEmployee
);

router.delete(
    "/:id",
    authMiddleware,
    requirePermission("delete", "employee"),
    deleteEmployee
);

export default router;