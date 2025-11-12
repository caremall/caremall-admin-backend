import Offer from '../../models/offerManagement.mjs';
import mongoose from "mongoose";
import Product from '../../models/Product.mjs';
import Brand from '../../models/Brand.mjs';
import Category from '../../models/Category.mjs';
import Variant from '../../models/Variant.mjs';
import Coupon from '../../models/coupon.mjs';
import { enrichProductsWithDefaultVariants } from '../../utils/enrichedProducts.mjs';


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

  if (!couponCode) {
    return res.status(400).json({ 
      success: false,
      message: "Coupon code is required",
      data: {
        error: "VALIDATION_ERROR",
        details: "couponCode field is missing"
      }
    });
  }

  if (!totalPrice || totalPrice <= 0) {
    return res.status(400).json({ 
      success: false,
      message: "Valid total price is required",
      data: {
        error: "VALIDATION_ERROR",
        details: "totalPrice must be a positive number"
      }
    });
  }

  try {
    const coupon = await Coupon.findOne({
      code: { $regex: new RegExp(`^${couponCode.trim()}$`, 'i') },
      active: true
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid or inactive coupon",
        data: {
        
        }
      });
    }

    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Coupon has expired",
        data: {
         
        }
      });
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit reached",
        data: {
         
        }
      });
    }

    const numericTotalPrice = Number(totalPrice);
    
    let discountAmount = 0;
    
    if (coupon.discountType === "fixed") {
      discountAmount = Number(coupon.discountValue);
    } else if (coupon.discountType === "percentage") {
      const discountPercentage = Number(coupon.discountValue);
      
      if (isNaN(discountPercentage)) {
        return res.status(400).json({
          success: false,
          message: "Invalid discount percentage",
          data: {
           
          }
        });
      }
      
      discountAmount = (discountPercentage / 100) * numericTotalPrice;
      
      console.log("Percentage calculation:", {
        discountPercentage: discountPercentage,
        totalPrice: numericTotalPrice,
        calculatedDiscount: discountAmount,
        calculation: `(${discountPercentage} / 100) * ${numericTotalPrice} = ${discountAmount}`
      });

      if (coupon.maxDiscountAmount) {
        const maxDiscount = Number(coupon.maxDiscountAmount);
        discountAmount = Math.min(discountAmount, maxDiscount);
        console.log("After max cap:", discountAmount);
      }
    }

    discountAmount = Math.min(discountAmount, numericTotalPrice);
    discountAmount = Math.round(discountAmount * 100) / 100;

    const finalPrice = numericTotalPrice - discountAmount;

    console.log("Final calculation:", {
      originalPrice: numericTotalPrice,
      discountAmount: discountAmount,
      finalPrice: finalPrice
    });

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully!",
      data: {
        discountAmount,
        finalPrice,
        couponId: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue, 
        maxDiscountAmount: coupon.maxDiscountAmount, 
        originalPrice: totalPrice 
      }
    });
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: {
        error: "INTERNAL_SERVER_ERROR",
        details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      }
    });
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

    // Remove any null/undefined items
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


