import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  changeCategoryStatus,
} from "../../controllers/warehouse/category.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = express.Router();

router.route("/").get(getAllCategories).post(catchAsyncErrors(createCategory));

router
  .route("/:id")
  .get(getCategoryById)
  .put(updateCategory)
  .delete(deleteCategory);

router.patch("/:id/status", changeCategoryStatus);

export default router;
