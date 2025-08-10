import express from 'express';
import {
    createOrder,
    getUserOrders,
    getOrderById,
    cancelOrder,
    verifyOrder,
    verifyOrderSignature,
} from '../../controllers/user/orders.controller.mjs';
import { verifyUserToken } from '../../middlewares/verifyToken.mjs';
import { catchAsyncErrors } from '../../utils/catchAsyncErrors.mjs';



const router = express.Router();

router.post('/', verifyUserToken, catchAsyncErrors(createOrder));

router.post('/verify', verifyUserToken, verifyOrder);

router.post('/verify-signature', verifyUserToken, verifyOrderSignature);

router.get('/', verifyUserToken, getUserOrders);

router.get('/:id', verifyUserToken, getOrderById);

router.patch('/:id/cancel', verifyUserToken, cancelOrder);



export default router;
