import { Router } from 'express'
import { createProduct, deleteProduct, getAllProducts, getProductById, updateProduct } from '../controllers/products.controller.mjs'

const router = Router()


router.route('/')
    .get(getAllProducts)
    .post(createProduct)

router.route('/:id')
    .get(getProductById)
    .put(updateProduct)
    .delete(deleteProduct)



export default router