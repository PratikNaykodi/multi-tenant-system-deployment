import express from "express";
import { create } from "../controllers/Tenant/tenantController.js";
const r = express.Router();
r.post("/", create);
export default r;
