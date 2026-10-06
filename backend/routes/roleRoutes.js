import express from "express";

import {
    getRoles
} from "../controllers/roleController.js";

import {
    authMiddleware
} from "../middleware/authMiddleware.js";

import {
    tenantMiddleware
} from "../middleware/tenantMiddleware.js";

const router = express.Router();

router.get(
    "/",
    tenantMiddleware,
    authMiddleware,
    getRoles
);

export default router;