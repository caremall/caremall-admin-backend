import express from "express";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";
import { createCarrier, deleteCarrier, getAllCarriers, getCarrierById, updateCarrier } from "../../controllers/warehouse/carrier.controller.mjs";

const router = express.Router();

router.post("/", catchAsyncErrors(createCarrier));
router.get("/", getAllCarriers);
router.get("/:id", getCarrierById);
router.put("/:id", updateCarrier);
router.delete("/:id", deleteCarrier);

export default router;
