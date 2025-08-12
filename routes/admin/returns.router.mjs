import express from "express";
import {
  getAllReturns,
  getReturnByIdAdmin,
  updateReturnStatus,
  updateRefundStatus,
  markReturnComplete,
  updatePickupStatus,
} from "../../controllers/admin/returns.controller.mjs";

const router = express.Router();

router.get("/", getAllReturns); // GET /api/admin/returns
router.get("/:id", getReturnByIdAdmin); // GET /api/admin/returns/:id
router.patch("/:id/status", updateReturnStatus); // PATCH /api/admin/returns/:id/status
router.patch("/:id/refund", updateRefundStatus); // PATCH /api/admin/returns/:id/refund
router.patch("/:id/complete", markReturnComplete); // PATCH /api/admin/returns/:id/complete
router.patch("/:id/pickup", updatePickupStatus); // PATCH /api/admin/returns/:id/pickup

export default router;
