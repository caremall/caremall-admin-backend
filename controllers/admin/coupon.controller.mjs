import Coupon from "../../models/coupon.mjs";

// Create a new coupon
export const createCoupon = async (req, res) => {
  try {
    let {
      code,
      discountType,
      discountValue,
      maxDiscountAmount = null,
      usageLimit = null,
      expiryDate,
      active = true,
      createdBy = "Admin",
    } = req.body;

    // Trim strings and sanitize enums
    code = code?.trim();
    createdBy = createdBy?.trim();

    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({ message: "Invalid discountType" });
    }
    if (typeof discountValue !== "number") {
      discountValue = parseFloat(discountValue);
      if (isNaN(discountValue)) {
        return res.status(400).json({ message: "Invalid discountValue" });
      }
    }
    if (expiryDate) {
      const parsedDate = new Date(expiryDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid expiryDate" });
      }
      expiryDate = parsedDate;
    }

    const newCoupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      maxDiscountAmount,
      usageLimit,
      expiryDate,
      active,
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: newCoupon,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(409).json({ message: "Coupon code must be unique" });
    }
    console.error("Create Coupon Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all coupons with optional filters and pagination
export const getAllCoupons = async (req, res) => {
  try {
    const { search = "", active, page = 1, limit = 10 } = req.query;
    const filter = {
      ...(search && { code: { $regex: search, $options: "i" } }),
      ...(active !== undefined ? { active: active === "true" } : {}),
    };
    const skip = (Number(page) - 1) * Number(limit);

    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Coupon.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: coupons,
      meta: {
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get All Coupons Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get coupon by ID
export const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    console.error("Get Coupon By ID Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update coupon by ID
export const updateCoupon = async (req, res) => {
  try {
    let {
      code,
      discountType,
      discountValue,
      maxDiscountAmount,
      usageLimit,
      expiryDate,
      active,
      createdBy,
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    // Validation and sanitization
    if (code !== undefined) coupon.code = code?.trim() || coupon.code;
    if (discountType !== undefined) {
      if (!["percentage", "fixed"].includes(discountType)) {
        return res.status(400).json({ message: "Invalid discountType" });
      }
      coupon.discountType = discountType;
    }
    if (discountValue !== undefined) {
      let val =
        typeof discountValue === "number"
          ? discountValue
          : parseFloat(discountValue);
      if (isNaN(val)) {
        return res.status(400).json({ message: "Invalid discountValue" });
      }
      coupon.discountValue = val;
    }
    if (maxDiscountAmount !== undefined)
      coupon.maxDiscountAmount = maxDiscountAmount;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (expiryDate !== undefined) {
      if (expiryDate) {
        const parsedDate = new Date(expiryDate);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ message: "Invalid expiryDate" });
        }
        coupon.expiryDate = parsedDate;
      } else {
        coupon.expiryDate = undefined;
      }
    }
    if (active !== undefined) coupon.active = active;
    if (createdBy !== undefined)
      coupon.createdBy = createdBy?.trim() || coupon.createdBy;

    await coupon.save();

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: coupon,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(409).json({ message: "Coupon code must be unique" });
    }
    console.error("Update Coupon Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete coupon by ID
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Delete Coupon Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
