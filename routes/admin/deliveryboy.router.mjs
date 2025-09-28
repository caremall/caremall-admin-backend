import express from "express";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";
import { createDeliveryBoy, deleteDeliveryBoy, getAllDeliveryBoys, getDeliveryBoyById, loginDeliveryBoy, updateDeliveryBoy } from "../../controllers/admin/deliveryboy.controller.mjs";

const router = express.Router();

router.post("/", catchAsyncErrors(createDeliveryBoy));
router.get("/", getAllDeliveryBoys);
router.get("/:id", getDeliveryBoyById);
router.put("/:id", updateDeliveryBoy);
router.delete("/:id", deleteDeliveryBoy);

router.post("/login", catchAsyncErrors(loginDeliveryBoy));

export default router;
