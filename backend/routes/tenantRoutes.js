import express, { Router } from "express";
import { create } from "../controllers/Tenant/tenantController.js";

const route = express.Router();

route.post("/", create);

export default route;
