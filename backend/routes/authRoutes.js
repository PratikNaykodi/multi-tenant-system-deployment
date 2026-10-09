import express from "express";
import * as c from "../controllers/Auth/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { tenantMiddleware } from "../middleware/tenantMiddleware.js";

const r = express.Router();
r.post("/register", tenantMiddleware, c.register);
r.post("/login", tenantMiddleware, c.login);
// Restore the authenticated user after a hard browser refresh.
r.get("/me", authMiddleware, tenantMiddleware, c.me);
export default r;
