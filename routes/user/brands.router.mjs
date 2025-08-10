import { Router } from "express";
import { getAllBrands } from "../../controllers/user/brands.controller.mjs";

const router = Router()

router.get('/', getAllBrands)


export default router