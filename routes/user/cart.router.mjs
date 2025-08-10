
import { Router } from 'express';
import {
    addToCart,
    getCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    bulkAddToCart,
} from '../../controllers/user/cart.controller.mjs';
import { verifyUserToken } from '../../middlewares/verifyToken.mjs';

const router = Router();


router.use(verifyUserToken);

router.post('/add', addToCart);

router.post('/bulk-add', bulkAddToCart);

router.get('/', getCart);

router.put('/update', updateCartItem);

router.delete('/remove', removeCartItem);

router.delete('/clear', clearCart);



export default router;
