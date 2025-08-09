import express from "express";
import {
  createUser,
  getAllUsers,
  blockOrUnblockUser,
} from "../../controllers/admin/users.controller.mjs";

const router = express.Router();

router.post("/", createUser);
router.get("/", getAllUsers);
router.patch("/:id", blockOrUnblockUser);

export default router;
