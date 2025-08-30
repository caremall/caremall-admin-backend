import express from "express";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";
import { createCoupon, deleteCoupon, getAllCoupons, getCouponById, updateCoupon } from "../../controllers/admin/coupon.controller.mjs";

const router = express.Router();

router.get("/", getAllCoupons);
router.get("/:id", getCouponById);
router.post("/", catchAsyncErrors(createCoupon));
router.put("/:id", updateCoupon);
router.delete("/:id", deleteCoupon);

export default router;
