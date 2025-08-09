import express from 'express';
import {
    createOrder,
    getUserOrders,
    getOrderById,
    cancelOrder,
    verifyOrder,
} from '../../controllers/user/orders.controller.mjs';
import { verifyUserToken } from '../../middlewares/verifyToken.mjs';



const router = express.Router();

router.post('/', verifyUserToken, createOrder);

router.post('/', verifyUserToken, verifyOrder);

router.get('/', verifyUserToken, getUserOrders);

router.get('/:id', verifyUserToken, getOrderById);

router.patch('/:id/cancel', verifyUserToken, cancelOrder);




export default router;
