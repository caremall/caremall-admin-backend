import express from "express";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";
import {
  createDeliveryBoy,
  deleteDeliveryBoy,
  getAllDeliveryBoys,
  getAssignedOrders,
  getDeliveryBoyById,
  loginDeliveryBoy,
  markOrderDelivered,
  updateDeliveryBoy,
} from "../../controllers/admin/deliveryboy.controller.mjs";
import { verifyDeliveryBoyToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.get("/assigned-orders", verifyDeliveryBoyToken, getAssignedOrders);
router.post("/delivered/:id", verifyDeliveryBoyToken, markOrderDelivered);

router.post("/", catchAsyncErrors(createDeliveryBoy));
router.get("/", getAllDeliveryBoys);
router.get("/:id", getDeliveryBoyById);
router.put("/:id", updateDeliveryBoy);
router.delete("/:id", deleteDeliveryBoy);

router.post("/login", catchAsyncErrors(loginDeliveryBoy));

export default router;
