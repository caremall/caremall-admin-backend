import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
} from "../../controllers/admin/blogs.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = express.Router();

router.post("/", catchAsyncErrors(createBlog));
router.get("/", getAllBlogs);
router.get("/:id", getBlogById);
router.put("/:id", updateBlog);
router.delete("/:id", deleteBlog);

export default router;
