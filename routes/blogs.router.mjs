import express from 'express';
import {
    createBlog,
    getAllBlogs,
    getBlogById,
    updateBlog,
    deleteBlog
} from '../controllers/blogs.controller.mjs';

const router = express.Router();

router.post('/', createBlog);
router.get('/', getAllBlogs);
router.get('/:id', getBlogById);
router.put('/:id', updateBlog);
router.delete('/:id', deleteBlog);

export default router;
