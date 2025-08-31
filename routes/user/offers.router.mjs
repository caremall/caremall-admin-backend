
import { Router } from 'express';

import { applyCouponCode, getPublishedOffersWithDuration } from '../../controllers/user/offers.controller.mjs';

const router = Router();

router.get('/limited-time-offers', getPublishedOffersWithDuration);
router.post('/apply-coupon', applyCouponCode);

export default router;
