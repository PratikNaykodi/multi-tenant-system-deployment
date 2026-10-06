import express from "express";

import {
    getCurrentUser,
    createUser,
    getUsers,
    getUser,
    updateUser,
    deleteUser
} from "../controllers/userController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

// --------------------------------------------------
// Current Logged-in User
// --------------------------------------------------
router.get(
    "/me",
    authMiddleware,
    getCurrentUser
);

// --------------------------------------------------
// Create User
// Permission: user.create
// --------------------------------------------------
router.post(
    "/",
    authMiddleware,
    requirePermission("create", "user"),
    createUser
);

// --------------------------------------------------
// Get All Users
// Permission: user.read
// --------------------------------------------------
router.get(
    "/",
    authMiddleware,
    requirePermission("read", "user"),
    getUsers
);

// --------------------------------------------------
// Get User By ID
// Permission: user.read
// --------------------------------------------------
router.get(
    "/:id",
    authMiddleware,
    requirePermission("read", "user"),
    getUser
);

// --------------------------------------------------
// Update User
// Permission: user.update
// --------------------------------------------------
router.put(
    "/:id",
    authMiddleware,
    requirePermission("update", "user"),
    updateUser
);

// --------------------------------------------------
// Delete User
// Permission: user.delete
// --------------------------------------------------
router.delete(
    "/:id",
    authMiddleware,
    requirePermission("delete", "user"),
    deleteUser
);

export default router;