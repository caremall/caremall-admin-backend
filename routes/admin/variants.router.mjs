import express from "express";
import {
  createVariants,
  getAllVariants,
  getVariantsByProductId,
  updateVariant,
  deleteVariant,
  setDefaultVariant,
} from "../../controllers/admin/variants.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = express.Router();

// Create variants for a product
router.post("/:productId", catchAsyncErrors(createVariants));

// Get all variants (admin)
router.get("/", getAllVariants);

// Get variants for a specific product
router.get("/product/:productId", getVariantsByProductId);

// Update a variant
router.put("/:id", updateVariant);

// Delete a variant
router.delete("/:id", deleteVariant);

// Set default variant
router.put("/:id/set-default", setDefaultVariant);

export default router;
