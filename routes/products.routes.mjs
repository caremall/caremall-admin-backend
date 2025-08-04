import { Router } from 'express'
import { createProduct, deleteProduct, getAllProducts, getProductBySlug, updateProduct } from '../controllers/products.controller.mjs'

const router = Router()


router.route('/')
    .get(getAllProducts)
    .post(createProduct)

router.route('/:slug')
    .get(getProductBySlug)
    .put(updateProduct)
    .delete(deleteProduct)



export default router