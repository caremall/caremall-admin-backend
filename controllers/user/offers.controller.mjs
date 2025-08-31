import Coupon from '../../models/coupon.mjs';
import Offer from '../../models/offerManagement.mjs';

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
      code: couponCode.trim(),
      active: true,
    });
    if (!coupon)
      return res.status(404).json({ message: "Invalid or inactive coupon" });

    if (coupon.expiryDate && coupon.expiryDate < new Date())
      return res.status(400).json({ message: "Coupon expired" });

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit)
      return res.status(400).json({ message: "Coupon usage limit reached" });

    let discountAmount = 0;

    if (coupon.discountType === "fixed") {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === "percentage") {
      discountAmount = (coupon.discountValue / 100) * totalPrice;
      if (coupon.maxDiscountAmount !== null) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    }

    discountAmount = Math.min(discountAmount, totalPrice);

    res.status(200).json({
      success: true,
      discountAmount,
      finalPrice: totalPrice - discountAmount,
      message: `Coupon applied successfully.`,
    });
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
