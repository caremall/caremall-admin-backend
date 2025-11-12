import Offer from '../../models/offerManagement.mjs';
import mongoose from "mongoose";
import Product from '../../models/Product.mjs';
import Brand from '../../models/Brand.mjs';
import Category from '../../models/Category.mjs';
import Variant from '../../models/Variant.mjs';
import Coupon from '../../models/coupon.mjs';
import { enrichProductsWithDefaultVariants } from '../../utils/enrichedProducts.mjs';

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
   
    const coupon = await Coupon.findOne({
      code: { $regex: new RegExp(`^${couponCode.trim()}$`, 'i') },
      active: true
    });

    if (!coupon)
      return res.status(404).json({ message: "Invalid or inactive coupon" });


    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }

    const numericTotalPrice = Number(totalPrice);
    
    let discountAmount = 0;
    
    if (coupon.discountType === "fixed") {
      discountAmount = Number(coupon.discountValue);
    } else if (coupon.discountType === "percentage") {
      const discountPercentage = Number(coupon.discountValue);
      
      if (isNaN(discountPercentage)) {
        return res.status(400).json({ message: "Invalid discount percentage" });
      }
      
      discountAmount = (discountPercentage / 100) * numericTotalPrice;
      
      console.log("Percentage calculation:", {
        discountPercentage: discountPercentage,
        totalPrice: numericTotalPrice,
        calculatedDiscount: discountAmount,
        calculation: `(${discountPercentage} / 100) * ${numericTotalPrice} = ${discountAmount}`
      });

      // Apply maximum discount cap if specified (your existing ₹500 cap)w
      if (coupon.maxDiscountAmount) {
        const maxDiscount = Number(coupon.maxDiscountAmount);
        discountAmount = Math.min(discountAmount, maxDiscount);
        console.log("After max cap:", discountAmount);
      }
    }

    // Ensure discount doesn't exceed total price
    discountAmount = Math.min(discountAmount, numericTotalPrice);
    discountAmount = Math.round(discountAmount * 100) / 100;

    const finalPrice = numericTotalPrice - discountAmount;

    console.log("Final calculation:", {
      originalPrice: numericTotalPrice,
      discountAmount: discountAmount,
      finalPrice: finalPrice
    });

    
    await Coupon.updateOne(
      { _id: coupon._id },
      { $inc: { usageCount: 1 } }
    );

    return res.status(200).json({
      success: true,
      discountAmount,
      finalPrice,
      message: "Coupon applied successfully!",
      couponId: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue, 
      maxDiscountAmount: coupon.maxDiscountAmount, 
      originalPrice: totalPrice 
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

    
    if (offer.offerEligibleItems?.length) {
      switch (offer.offerType) {
        case "product":
          {
            const products = await Product.find({
              _id: { $in: offer.offerEligibleItems },
              productStatus: "published",
              visibility: "visible",
            })
              .select(
                "productId productName shortDescription productDescription brand category sellingPrice mrpPrice productImages urlSlug hasVariant defaultVariant variants"
              )
              .populate("brand", "name")
              .populate("category", "name")
              .populate(
                "defaultVariant",
                "variantId images sellingPrice mrpPrice SKU barcode isDefault"
              )
              .populate(
                "variants",
                "variantId images sellingPrice mrpPrice SKU barcode availableQuantity weight dimensions isDefault"
              )
              .lean();

            
            populatedItems = await enrichProductsWithDefaultVariants(products);
          }
          break;

        case "brand":
          populatedItems = await Brand.find({
            _id: { $in: offer.offerEligibleItems },
            status: "active",
          })
            .select("brandName tagline description termsAndConditions status imageUrl")
            .lean();
          break;

        case "category":
          populatedItems = await Category.find({
            _id: { $in: offer.offerEligibleItems },
            status: "active",
          })
            .select("type image name description parentId categoryCode status isPopular")
            .populate("parentId", "name")
            .lean();
          break;

        case "cart":
          populatedItems = offer.offerEligibleItems;
          break;

        default:
          populatedItems = offer.offerEligibleItems;
      }
    }

    // 🧹 Remove any null/undefined items
    populatedItems = populatedItems.filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        ...offer,
        offerEligibleItems: populatedItems,
        offerEligibleProducts: populatedItems,
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


