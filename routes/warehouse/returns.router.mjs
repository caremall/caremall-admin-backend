import express from "express";
import { getAllReturns,
    updateReturnStatus,
    updateRefundStatus
} from "../../controllers/warehouse/Returns.controller.mjs";

const router = express.Router();

// Get all variants (admin)
router.get("/", getAllReturns);
router.patch("/:id/status", updateReturnStatus); // PATCH /api/admin/returns/:id/status
router.patch("/:id/refund", updateRefundStatus); // PATCH /api/admin/returns/:id/refund

export default router;
