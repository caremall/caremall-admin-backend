

import { Router } from 'express';
import {
    createHeroBanner,
    getAllHeroBanners,
    updateHeroBanner,
    deleteHeroBanner,
    getHeroBanner,
} from '../../controllers/admin/herobanner.controller.mjs';

const router = Router();

router.post('/', createHeroBanner);
router.get('/', getAllHeroBanners);
router.get('/:id', getHeroBanner);
router.put('/:id', updateHeroBanner);
router.delete('/:id', deleteHeroBanner);

export default router;
