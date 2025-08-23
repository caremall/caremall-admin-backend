import { Router } from "express";
import {  getAllCategories, getCategoryProducts } from "../../controllers/user/categories.controller.mjs";

const router = Router()

router.get('/', getAllCategories)
router.get('/:id', getCategoryProducts)

export default router
