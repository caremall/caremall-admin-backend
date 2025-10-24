import Offer from '../../models/offerManagement.mjs';
import mongoose from "mongoose";
import Product from '../../models/Product.mjs';
import Brand from '../../models/Brand.mjs';
import Category from '../../models/Category.mjs';
import Variant from '../../models/Variant.mjs';

// Get active published offers with a valid duration
export const getPublishedOffersWithDuration = async (req, res) => {
  try {
    const currentDate = new Date();

    const offers = await Offer.find({
      offerStatus: 'published',
      offerRedeemTimePeriod: {
        $exists: true,
        $type: 'array',
        $size: 2
      },
      'offerRedeemTimePeriod.0': { $lte: currentDate }, // start date <= now
      'offerRedeemTimePeriod.1': { $gte: currentDate }  // end date >= now
    });

    res.status(200).json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching offers',
      error: error.message
    });
  }
};

export const applyCouponCode = async (req, res) => {
  const { couponCode, totalPrice } = req.body;

  if (!couponCode)
    return res.status(400).json({ message: "Coupon code is required" });

  if (!totalPrice || totalPrice <= 0)
    return res.status(400).json({ message: "Valid total price is required" });

  try {
    const offer = await Offer.findOne({
      code: couponCode.trim(),
      offerStatus: "published", // Only allow published offers
    });

    if (!offer)
      return res.status(404).json({ message: "Invalid or inactive coupon" });

    // Check usage limits
    // if (offer.usageLimit !== null && offer.usageCount >= offer.usageLimit)
    //   return res.status(400).json({ message: "Coupon usage limit reached" });

    // Check if current date is within redeem period (optional)
    if (
      offer.offerRedeemTimePeriod &&
      offer.offerRedeemTimePeriod.length === 2 &&
      (new Date() < offer.offerRedeemTimePeriod[0] ||
        new Date() > offer.offerRedeemTimePeriod[1])
    ) {
      return res
        .status(400)
        .json({ message: "Coupon not redeemable at this time" });
    }

    let discountAmount = 0;

    if (offer.offerDiscountUnit === "fixed") {
      discountAmount = offer.offerDiscountValue;
    } else if (offer.offerDiscountUnit === "percentage") {
      discountAmount = (offer.offerDiscountValue / 100) * totalPrice;
      if (
        offer.maxDiscountAmount !== undefined &&
        offer.maxDiscountAmount !== null
      ) {
        discountAmount = Math.min(discountAmount, offer.maxDiscountAmount);
      }
    }

    discountAmount = Math.min(discountAmount, totalPrice);

    res.status(200).json({
      success: true,
      discountAmount,
      finalPrice: totalPrice - discountAmount,
      message: "Coupon applied successfully.",
      offerId: offer._id, // optional: include offer ID for further processing
    });
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const getOfferByID = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "Offer ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid offer ID format" });
    }

    const offer = await Offer.findById(id).lean();

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    let populatedItems = [];
    
    // Handle different offer types
    if (offer.offerEligibleItems?.length) {
      switch (offer.offerType) {
        case "product":
          // Populate products with brands and categories
          populatedItems = await Product.find({
            _id: { $in: offer.offerEligibleItems },
            productStatus: "published",
            visibility: "visible"
          })
          .select("productId productName shortDescription productDescription brand category sellingPrice mrpPrice productImages urlSlug hasVariant defaultVariant")
          .populate("brand", "name")
          .populate("category", "name")
          .populate("defaultVariant", "variantId images sellingPrice mrpPrice SKU barcode isDefault")
          .populate("variants", "variantId images sellingPrice mrpPrice SKU barcode availableQuantity weight dimensions isDefault")
          .lean();
          break;

        case "brand":
          // Populate brands
          populatedItems = await Brand.find({
            _id: { $in: offer.offerEligibleItems },
            status: "active"
          })
          .select("brandName tagline description termsAndConditions status imageUrl")
          .lean();
          break;

        case "category":
          // Populate categories
          populatedItems = await Category.find({
            _id: { $in: offer.offerEligibleItems },
            status: "active"
          })
          .select("type image name description parentId categoryCode status isPopular")
          .populate("parentId", "name")
          .lean();
          break;

        case "cart":
          // For cart offers, eligible items might be empty or contain specific rules
          populatedItems = offer.offerEligibleItems; // Use as-is or process based on your cart logic
          break;

        default:
          populatedItems = offer.offerEligibleItems;
      }
    }

    // Filter out any null items
    populatedItems = populatedItems.filter(item => item !== null);

    res.status(200).json({
      success: true,
      data: {
        ...offer,
        offerEligibleItems: populatedItems
      },
    });
  } catch (error) {
    console.error("Error fetching offer by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching offer details",
      error: error.message,
    });
  }
};

