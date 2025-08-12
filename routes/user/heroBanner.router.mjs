

import { Router } from 'express';
import { getActiveHeroBanners } from '../../controllers/user/heroBanners.controller.mjs';

const router = Router();

router.get('/', getActiveHeroBanners);

export default router;
