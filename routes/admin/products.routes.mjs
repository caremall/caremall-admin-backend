import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  getSearchSuggestions
} from "../../controllers/admin/products.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = Router();


router.get("/search", getSearchSuggestions);

router.route("/").get(getAllProducts).post(catchAsyncErrors(createProduct));

router
  .route("/get-by-slug/:slug")
  .get(getProductBySlug)

  router.route("/:id")
  .put(updateProduct)
  .delete(deleteProduct);

export default router;
