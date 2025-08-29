import HeroBanner from "../../models/HeroBanner.mjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";

/**
 * @desc Create a new hero banner
 * @route POST /hero-banners
 */
export const createHeroBanner = async (req, res) => {
  try {
    const {
      title,
      bannerImage,
      buttonText,
      buttonLinkType,
      redirectLink,
      sortOrder,
      isActive,
    } = req.body;

    let uploadedImageUrl = null;
    if (bannerImage) {
      uploadedImageUrl = await uploadBase64Image(bannerImage, "hero-banners/");
    }

    const banner = await HeroBanner.create({
      title,
      bannerImage: uploadedImageUrl,
      buttonText,
      buttonLinkType,
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
    let { search = "", active } = req.query;

    let filter = {};

    // Search by text or buttonName (case-insensitive)
    if (search) {
      filter.$or = [
        { text: { $regex: search, $options: "i" } },
        { buttonName: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by active status
    if (active !== undefined) {
      filter.isActive = active === "true";
    }

    // Fetch all banners matching filter, sorted
    const banners = await HeroBanner.find(filter).sort({
      sortOrder: 1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: banners,
      meta: {
        total: banners.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Get a single hero banner
 * @route GET /hero-banners/:id
 */
export const getHeroBanner = async (req, res) => {
  try {
    const banner = await HeroBanner.findById(req.params.id);

    if (!banner) {
      return res.status(404).json({ message: "Hero banner not found" });
    }
    res.status(200).json({ success: true, data: banner });
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
      return res.status(404).json({ message: "Hero banner not found" });
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
      return res.status(404).json({ message: "Hero banner not found" });
    }

    await banner.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Hero banner deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
