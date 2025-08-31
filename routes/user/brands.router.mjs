import { Router } from "express";
import { getAllBrands, getBrandById } from "../../controllers/user/brands.controller.mjs";


const router = Router()

router.get('/', getAllBrands)
router.get('/:id', getBrandById)


export default router