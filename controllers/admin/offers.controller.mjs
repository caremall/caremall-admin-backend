import Offer from "../../models/offerManagement.mjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";
import Product from "../../models/Product.mjs";
import Category from "../../models/Category.mjs";
import Brand from "../../models/Brand.mjs";
// Helper to validate and convert booking dates array
function parseBookingDates(bookingDates, fallback = []) {
  if (
    Array.isArray(bookingDates) &&
    bookingDates.length === 2 &&
    !bookingDates.some((d) => isNaN(new Date(d).getTime()))
  ) {
    return bookingDates.map((d) => new Date(d));
  }
  return fallback;
}

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
  let uploadedImageUrl=null;
  if(imageUrl){
        uploadedImageUrl=await uploadBase64Image(imageUrl,"offer-images/");
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
    offerImageUrl: uploadedImageUrl,
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
    const { search = "", status } = req.query;

    const query = {
      ...(search && { offerTitle: { $regex: search, $options: "i" } }),
      ...(status && { offerStatus: status }),
    };

    const offers = await Offer.find(query).sort({ createdAt: -1 });

    // ✅ Add totalEligibleItems dynamically
    const updatedOffers = await Promise.all(
      offers.map(async (offer) => {
        let totalEligibleItems = 0;

        switch (offer.offerType) {
          case "product":
            // uses product ids directly
            totalEligibleItems = offer.offerEligibleItems.length;
            break;

          case "category":
            // count products belonging to selected categories
            totalEligibleItems = await Product.countDocuments({
              category: { $in: offer.offerEligibleItems },
            });
            break;

          case "brand":
            // count products belonging to selected brands
            totalEligibleItems = await Product.countDocuments({
              brand: { $in: offer.offerEligibleItems },
            });
            break;

          case "cart":
            totalEligibleItems = 0; // cart-based offers do not depend on items
            break;

          default:
            totalEligibleItems = 0;
        }

        return {
          ...offer.toObject(),
          totalEligibleItems,
        };
      })
    );

    res.status(200).json({
      success: true,
      total: updatedOffers.length,
      data: updatedOffers,
    });

  } catch (error) {
    console.error("Get All Offers Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    let populatedItems = [];

    if (offer.offerEligibleItems?.length > 0) {
      if (offer.offerType === "product") {
        populatedItems = await Product.find(
          { _id: { $in: offer.offerEligibleItems } },
          { _id: 1, productName: 1 }
        );
      } else if (offer.offerType === "category") {
        populatedItems = await Category.find(
          { _id: { $in: offer.offerEligibleItems } },
          { _id: 1, name: 1 }
        );
      } else if (offer.offerType === "brand") {
        populatedItems = await Brand.find(
          { _id: { $in: offer.offerEligibleItems } },
          { _id: 1, brandName: 1 }
        );
      } else {
        // for cart type – keep original values
        populatedItems = offer.offerEligibleItems;
      }
    }

    const response = {
      ...offer.toObject(),
      offerEligibleItems: populatedItems,
    };

    res.status(200).json({ success: true, data: response });

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
      offerEligibleItems,
      isFeatured,
      status,
      author,
    } = req.body;

    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    let uploadedImageUrl = offer.offerImageUrl;
    
    // Handle image upload if new image is provided and different from current
    if (imageUrl && imageUrl !== offer.offerImageUrl) {
      try {
        uploadedImageUrl = await uploadBase64Image(imageUrl, "offer-images/");
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(400).json({ message: "Failed to upload image" });
      }
    }

    // Sanitize enums & bookingDates
    // Only validate bookingDates if it is provided in req.body
    if ("bookingDates" in req.body) {
      if (status === "draft") {
        bookingDates = parseBookingDates(
          bookingDates,
          offer.offerRedeemTimePeriod
        );
      } else {
        bookingDates = parseBookingDates(bookingDates);
        if (!Array.isArray(bookingDates) || bookingDates.length !== 2) {
          return res.status(400).json({ message: "Invalid bookingDates" });
        }
      }
    } else {
      // bookingDates not in request, keep existing
      bookingDates = offer.offerRedeemTimePeriod;
    }

    // Update fields only if provided (cleaner check vs falsy values)
    if (typeof title === "string") offer.offerTitle = title.trim();
    if (typeof description === "string") offer.offerDescription = description.trim();
    if (offerType !== undefined) offer.offerType = offerType;
    if (discountUnit !== undefined) offer.offerDiscountUnit = discountUnit;
    if (discountValue !== undefined) {
      const parsedValue = parseFloat(discountValue);
      if (!isNaN(parsedValue)) {
        offer.offerDiscountValue = parsedValue;
      }
    }
    if (minimumOrderValue !== undefined) {
      const parsedValue = parseFloat(minimumOrderValue);
      if (!isNaN(parsedValue)) {
        offer.offerMinimumOrderValue = parsedValue;
      }
    }
    if (uploadedImageUrl) offer.offerImageUrl = uploadedImageUrl;
    if (Array.isArray(bookingDates) && bookingDates.length === 2) {
      offer.offerRedeemTimePeriod = bookingDates;
    }
    if (Array.isArray(offerEligibleItems)) offer.offerEligibleItems = offerEligibleItems;
    if (typeof isFeatured === "boolean") offer.isOfferFeatured = isFeatured;
    if (typeof status === "string") offer.offerStatus = status;
    if (typeof author === "string") offer.offerAuthor = author.trim();

    await offer.save();

    res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      data: offer,
    });
  } catch (error) {
    console.error("Update Offer Error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
