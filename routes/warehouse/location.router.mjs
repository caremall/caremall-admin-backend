import express from "express";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";
import { createWarehouseLocation, deleteWarehouseLocation, getWarehouseLocationById, getWarehouseLocations, updateWarehouseLocation } from "../../controllers/warehouse/location.controller.mjs";

const router = express.Router();

router.post("/", catchAsyncErrors(createWarehouseLocation));
router.get("/", getWarehouseLocations);
router.get("/:id", getWarehouseLocationById);
router.put("/:id", updateWarehouseLocation);
router.delete("/:id", deleteWarehouseLocation);

export default router;
