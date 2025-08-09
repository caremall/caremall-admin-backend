import express from "express";
import {
  createUser,
  getAllUsers,
  blockOrUnblockUser,
} from "../../controllers/admin/users.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = express.Router();

router.post("/", catchAsyncErrors(createUser));
router.get("/", getAllUsers);
router.patch("/:id", blockOrUnblockUser);

export default router;
