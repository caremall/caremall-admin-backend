
import { Router } from 'express';

import { applyCouponCode, getPublishedOffersWithDuration, getOfferByID } from '../../controllers/user/offers.controller.mjs';

const router = Router();

router.get('/limited-time-offers', getPublishedOffersWithDuration);
router.post('/apply-coupon', applyCouponCode);
router.get('/:id', getOfferByID);

export default router;
