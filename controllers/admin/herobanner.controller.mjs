
import HeroBanner from '../../models/HeroBanner.mjs';

/**
 * @desc Create a new hero banner
 * @route POST /hero-banners
 */
export const createHeroBanner = async (req, res) => {
    try {
        const { bannerImage, text, buttonName, redirectLink, sortOrder, isActive } = req.body;

        if (!bannerImage) {
            return res.status(400).json({ message: 'Banner image is required' });
        }

        const banner = await HeroBanner.create({
            bannerImage,
            text,
            buttonName,
            redirectLink,
            sortOrder,
            isActive,
        });

        res.status(201).json({ success: true, data: banner });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc Get all hero banners (admin) with pagination, search, and filter
 * @route GET /hero-banners
 * @query page, limit, search, active
 */
export const getAllHeroBanners = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '', active } = req.query;

        page = Number(page);
        limit = Number(limit);

        let filter = {};

        // Search by text or buttonName (case-insensitive)
        if (search) {
            filter.$or = [
                { text: { $regex: search, $options: 'i' } },
                { buttonName: { $regex: search, $options: 'i' } },
            ];
        }

        // Filter by active status
        if (active !== undefined) {
            filter.isActive = active === 'true';
        }

        const total = await HeroBanner.countDocuments(filter);

        const banners = await HeroBanner.find(filter)
            .sort({ sortOrder: 1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            data: banners,
            meta: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc Update a hero banner
 * @route PUT /hero-banners/:id
 */
export const updateHeroBanner = async (req, res) => {
    try {
        const banner = await HeroBanner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({ message: 'Hero banner not found' });
        }

        const updates = req.body;
        Object.assign(banner, updates);

        await banner.save();

        res.status(200).json({ success: true, data: banner });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc Delete a hero banner
 * @route DELETE /hero-banners/:id
 */
export const deleteHeroBanner = async (req, res) => {
    try {
        const banner = await HeroBanner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({ message: 'Hero banner not found' });
        }

        await banner.deleteOne();

        res.status(200).json({ success: true, message: 'Hero banner deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
