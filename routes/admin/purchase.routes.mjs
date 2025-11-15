import { Router } from "express";
import {
  createPurchase,
  getPurchases,
  updatePurchase,
  deletePurchase,
} from "../../controllers/admin/purchase.controller.mjs"; // adjust path

const router = Router();

router.post("/", createPurchase); // POST /purchase
router.get("/", getPurchases); // GET /purchase
router.put("/:id", updatePurchase);
router.delete("/:id", deletePurchase);

export default router;
