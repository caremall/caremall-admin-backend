import { Router } from "express";
import {
  createProductType,
  getAllProductTypes,
  getProductTypeById,
  updateProductType,
  deleteProductType,
} from "../../controllers/warehouse/productType.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = Router();

router.post("/", catchAsyncErrors(createProductType));
router.get("/", getAllProductTypes);
router.get("/:id", getProductTypeById);
router.put("/:id", updateProductType);
router.delete("/:id", deleteProductType);

export default router;
