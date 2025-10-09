import express from "express";
import {  getAllActiveProductCards, getProductCardById } from "../../controllers/admin/product.card.controller.mjs";


const router = express.Router();

// Highlight routes
router.get("/", getAllActiveProductCards);
router.get("/:id", getProductCardById);

export default router;
