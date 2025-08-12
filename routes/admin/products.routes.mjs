import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  searchProducts
} from "../../controllers/admin/products.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = Router();


router.get("/search", catchAsyncErrors(searchProducts));

router.route("/").get(getAllProducts).post(catchAsyncErrors(createProduct));

router
  .route("/:slug")
  .get(getProductBySlug)
  .put(updateProduct)
  .delete(deleteProduct);

export default router;
