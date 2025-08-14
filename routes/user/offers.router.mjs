
import { Router } from 'express';

import { getPublishedOffersWithDuration } from '../../controllers/user/offers.controller.mjs';

const router = Router();

router.get('/limited-time-offers', getPublishedOffersWithDuration);

export default router;
