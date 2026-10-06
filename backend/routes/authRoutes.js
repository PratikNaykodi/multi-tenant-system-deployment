import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";

const router = express.Router();

router.post("/register", tenantMiddleware, registerUser);
router.post("/login", tenantMiddleware, loginUser);

export default router;