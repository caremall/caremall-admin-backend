
import HeroBanner from '../../models/HeroBanner.mjs';

/**
 * @desc Get active hero banners for user side
 * @route GET /hero-banners
 */
export const getActiveHeroBanners = async (req, res) => {
    try {
        const banners = await HeroBanner.find({ isActive: true })
            .sort({ sortOrder: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: banners,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
