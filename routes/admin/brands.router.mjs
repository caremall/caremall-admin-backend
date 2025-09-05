import express from "express";
import {
  createBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  changeBrandStatus,
} from "../../controllers/admin/brands.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = express.Router();

router.post("/", catchAsyncErrors(createBrand));
router.get("/", getAllBrands);
router.get("/:id", getBrandById);
router.put("/:id", updateBrand);
router.patch("/:id/status", changeBrandStatus);
router.delete("/:id", deleteBrand);

export default router;
