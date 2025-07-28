import { Router } from 'express';
import {
    createProductType,
    getAllProductTypes,
    getProductTypeById,
    updateProductType,
    deleteProductType
} from '../controllers/productType.controller.mjs';

const router = Router();

router.post('/', createProductType);
router.get('/', getAllProductTypes);
router.get('/:id', getProductTypeById);
router.put('/:id', updateProductType);
router.delete('/:id', deleteProductType);

export default router;
