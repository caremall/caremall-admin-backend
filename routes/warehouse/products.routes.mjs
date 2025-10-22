import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  getSearchSuggestions,
  getProductWithInventory
} from "../../controllers/warehouse/products.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = Router();


router.get("/search", getSearchSuggestions);

router.route("/").get(getAllProducts).post(catchAsyncErrors(createProduct));

router
  .route("/get-by-slug/:slug")
  .get(getProductBySlug)


router
  .route("/get-by-id/:id")
  .get(getProductWithInventory)

router.get("/inventory-detail/:productId/:variantId", getProductWithInventory);

router.put("/:id", updateProduct);

router.get("/inventory-detail/:productId", getProductWithInventory);

export default router;
