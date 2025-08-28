import express from "express";
import { createProductCard, deleteProductCard, getAllProductCards, getProductCardById, updateProductCard } from "../../controllers/admin/product.card.controller.mjs";


const router = express.Router();

// Highlight routes
router.post("/", createProductCard); 
router.put("/:id", updateProductCard);
router.get("/", getAllProductCards);
router.get("/:id", getProductCardById);
router.delete("/:id", deleteProductCard);

export default router;
