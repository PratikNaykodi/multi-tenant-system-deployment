import express from "express";
import * as controller from "../controllers/Auth/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";

const route = express.Router();

route.post("/register", tenantMiddleware, controller.register);

route.post("/login", tenantMiddleware, controller.login);

// Restore the authenticated user after a hard browser refresh.
route.get("/me", authMiddleware, tenantMiddleware, controller.me);

export default route;
