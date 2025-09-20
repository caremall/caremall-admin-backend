import express from "express";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";
import { createSupplier, deleteSupplier, getSupplierById, getSuppliers, updateSupplier } from "../../controllers/warehouse/supplier.controller.mjs";

const router = express.Router();

router.post("/", catchAsyncErrors(createSupplier));
router.get("/", getSuppliers);
router.get("/:id", getSupplierById);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

export default router;
