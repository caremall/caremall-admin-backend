import { Router } from "express";
import { getAllCategories } from "../../controllers/user/categories.controller.mjs";

const router = Router()

router.get('/', getAllCategories)

export default router
