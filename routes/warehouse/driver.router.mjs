import express from "express";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";
import { createDriver, deleteDriver, getAllDrivers, getDriverById, updateDriver } from "../../controllers/warehouse/driver.controller.mjs";

const router = express.Router();

router.post("/", catchAsyncErrors(createDriver));
router.get("/", getAllDrivers);
router.get("/:id", getDriverById);
router.put("/:id", updateDriver);
router.delete("/:id", deleteDriver);

export default router;
