import express from "express";
import { getDashboardStats } from "../../controllers/warehouse/dashboard.controller.mjs";

const router = express.Router();

router.get("/", getDashboardStats);

export default router;
