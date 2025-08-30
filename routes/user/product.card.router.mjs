import express from "express";
import { createProductCard, deleteProductCard, getAllProductCards, getProductCardById, updateProductCard } from "../../controllers/admin/product.card.controller.mjs";


const router = express.Router();

// Highlight routes
router.get("/", getAllProductCards);
router.get("/:id", getProductCardById);

export default router;
