import express from "express";
import { getAllReturns } from "../../controllers/warehouse/Returns.controller.mjs";

const router = express.Router();

// Get all variants (admin)
router.get("/", getAllReturns);

export default router;
