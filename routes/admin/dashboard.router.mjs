import express from "express";
import { getDashboardStats } from "../../controllers/admin/dashboard.controller.mjs";

const router = express.Router();

router.get("/", getDashboardStats);

export default router;
