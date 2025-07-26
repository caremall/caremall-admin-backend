import express from 'express';
import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    changeCategoryStatus,
} from '../controllers/category.controller.mjs';

const router = express.Router();

router.route('/')
    .get(getAllCategories)
    .post(createCategory);

router.route('/:id')
    .get(getCategoryById)
    .put(updateCategory)
    .delete(deleteCategory);

router.patch('/:id/status', changeCategoryStatus);

export default router;
