import express from "express";
import {
  createUser,
  getAllUsers,
  blockOrUnblockUser,
  createFirstOrderAmount,
  getFirstOrderAmount
} from "../../controllers/admin/users.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = express.Router();

router.post("/", catchAsyncErrors(createUser));
router.get("/", getAllUsers);
router.patch("/:id", blockOrUnblockUser);
router.post("/first-order-discount", createFirstOrderAmount);
router.get("/first-order-discount", getFirstOrderAmount);

export default router;
