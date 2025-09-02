import { Router } from "express";
import {  getAllCategories, getCategoryProducts, getSubcategoriesWithProducts } from "../../controllers/user/categories.controller.mjs";

const router = Router()

router.get('/', getAllCategories)
router.get('/:id', getCategoryProducts)
router.get('/sub/:id', getSubcategoriesWithProducts)

export default router
