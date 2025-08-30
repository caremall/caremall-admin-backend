import Offer from "../../models/offerManagement.mjs";

export const createOffer = async (req, res) => {
    let {
      title,
      description,
      offerType,
      discountUnit,
      discountValue,
      minimumOrderValue,
      imageUrl,
      bookingDates,
      eligibleItems,
      isFeatured,
      status,
      author = "Admin",
    } = req.body;

    // Trim strings
    title = title?.trim();

    // Sanitize enums for drafts
    if (status === "draft") {
      if (!["product", "category", "brand", "cart"].includes(offerType)) {
        offerType = undefined;
      }
      if (!["percentage", "fixed"].includes(discountUnit)) {
        discountUnit = undefined;
      }
      // Validate bookingDates: must be array of 2 valid dates, else empty array
      if (
        !Array.isArray(bookingDates) ||
        bookingDates.length !== 2 ||
        bookingDates.some((d) => isNaN(new Date(d).getTime()))
      ) {
        bookingDates = [];
      } else {
        // Convert strings to Date objects if valid
        bookingDates = bookingDates.map((d) => new Date(d));
      }
    } else {
      // For published/inactive, convert bookingDates properly
      if (
        Array.isArray(bookingDates) &&
        bookingDates.length === 2 &&
        !bookingDates.some((d) => isNaN(new Date(d).getTime()))
      ) {
        bookingDates = bookingDates.map((d) => new Date(d));
      } else {
        return res.status(400).json({ message: "Invalid bookingDates" });
      }
    }


    const newOffer = await Offer.create({
      offerTitle: title,
      offerDescription: description,
      offerType,
      offerDiscountUnit: discountUnit,
      offerDiscountValue:
        discountValue !== undefined ? parseFloat(discountValue) : undefined,
      offerMinimumOrderValue:
        minimumOrderValue !== undefined
          ? parseFloat(minimumOrderValue)
          : undefined,
      offerImageUrl: imageUrl,
      offerRedeemTimePeriod: bookingDates,
      offerEligibleItems: eligibleItems || [],
      isOfferFeatured: isFeatured,
      offerStatus: status,
      offerAuthor: author.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Offer created successfully",
      data: newOffer,
    });
};

export const getAllOffers = async (req, res) => {
  try {
    const { search = "", status, page = 1, limit = 10 } = req.query;
    const query = {
      ...(search && { offerTitle: { $regex: search, $options: "i" } }),
      ...(status && { offerStatus: status }),
    };

    const skip = (Number(page) - 1) * Number(limit);

    const [offers, total] = await Promise.all([
      Offer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Offer.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: offers,
      meta: {
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get All Offers Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get Offer By ID
export const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.status(200).json({ success: true, data: offer });
  } catch (error) {
    console.error("Get Offer By ID Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOffer = async (req, res) => {
  try {
    let {
      title,
      description,
      offerType,
      discountUnit,
      discountValue,
      minimumOrderValue,
      imageUrl,
      bookingDates,
      eligibleItems,
      isFeatured,
      status,
      author,
    } = req.body.data;

    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    // Sanitize enums & dates for drafts
    if (status === "draft") {
      if (!["product", "category", "brand", "cart"].includes(offerType)) {
        offerType = undefined;
      }
      if (!["percentage", "fixed"].includes(discountUnit)) {
        discountUnit = undefined;
      }
      if (
        !Array.isArray(bookingDates) ||
        bookingDates.length !== 2 ||
        bookingDates.some((d) => isNaN(new Date(d).getTime()))
      ) {
        bookingDates = offer.offerRedeemTimePeriod || [];
      } else {
        bookingDates = bookingDates.map((d) => new Date(d));
      }
    } else {
      if (
        Array.isArray(bookingDates) &&
        bookingDates.length === 2 &&
        !bookingDates.some((d) => isNaN(new Date(d).getTime()))
      ) {
        bookingDates = bookingDates.map((d) => new Date(d));
      } else {
        return res.status(400).json({ message: "Invalid bookingDates" });
      }
    }

    // Update fields conditionally
    offer.offerTitle = title?.trim() || offer.offerTitle;
    offer.offerDescription = description || offer.offerDescription;
    offer.offerType = offerType !== undefined ? offerType : offer.offerType;
    offer.offerDiscountUnit =
      discountUnit !== undefined ? discountUnit : offer.offerDiscountUnit;
    offer.offerDiscountValue =
      discountValue !== undefined
        ? parseFloat(discountValue)
        : offer.offerDiscountValue;
    offer.offerMinimumOrderValue =
      minimumOrderValue !== undefined
        ? parseFloat(minimumOrderValue)
        : offer.offerMinimumOrderValue;
    offer.offerImageUrl = imageUrl || offer.offerImageUrl;
    offer.offerRedeemTimePeriod =
      bookingDates.length === 2 ? bookingDates : offer.offerRedeemTimePeriod;
    offer.offerEligibleItems = eligibleItems || offer.offerEligibleItems;
    offer.isOfferFeatured =
      typeof isFeatured === "boolean" ? isFeatured : offer.isOfferFeatured;
    offer.offerStatus = status || offer.offerStatus;
    offer.offerAuthor = author?.trim() || offer.offerAuthor;

    await offer.save();

    res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      data: offer,
    });
  } catch (error) {
    console.error("Update Offer Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    console.error("Delete Offer Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateOfferStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      { offerStatus: status },
      { new: true }
    );
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.status(200).json({
      success: true,
      message: "Offer status updated successfully",
      data: offer,
    });
  } catch (error) {
    console.error("Update Offer Status Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
