import Offer from "../../models/offerManagement.mjs";

// {==================HELPER======================}

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

const checkOfferConflict = async ({
  offerType,
  eligibleItems,
  bookingDates,
}) => {
  console.log(
    { offerType, eligibleItems, bookingDates },
    "[][][][][]][][][][][][A][SDA][A][S"
  );

  const [start, end] = bookingDates;

  let query = {
    offerStatus: { $in: ["published", "inactive"] },
    offerRedeemTimePeriod: {
      $exists: true,
      $ne: [],
      $elemMatch: {
        $gte: start,
        $lte: end,
      },
    },
  };

  if (offerType === "category") {
    query.offerType = "category";
    query.offerEligibleItems = { $in: eligibleItems };
  }

  if (offerType === "brand") {
    query.$or = [
      {
        offerType: "category",
        offerEligibleItems: { $in: eligibleItems.map((i) => i.category) },
      },
      { offerType: "brand", offerEligibleItems: { $in: eligibleItems } },
    ];
  }

  if (offerType === "product") {
    query.$or = [
      {
        offerType: "category",
        offerEligibleItems: { $in: eligibleItems.map((i) => i.category) },
      },
      {
        offerType: "brand",
        offerEligibleItems: { $in: eligibleItems.map((i) => i.brand) },
      },
      { offerType: "product", offerEligibleItems: { $in: eligibleItems } },
    ];
  }

  console.log(
    query,
    "queryqueryqueryqueryqueryqueryqueryqueryqueryqueryqueryquery"
  );

  const existing = await Offer.findOne(query);
  console.log(
    existing,
    "existingexistingexistingexistingexistingexistingexisting"
  );

  return existing ? existing : null;
};

// {=======================CONTROLLER=======================}

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

  console.log(req.body, "=====================");

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

  // VALIDATION: Prevent overlapping offers
  if (status !== "draft") {
    const conflict = await checkOfferConflict({
      offerType,
      eligibleItems,
      bookingDates,
    });
    console.log(conflict, "conflictconflictconflictconflictconflictconflict");

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: `Conflicting offer already exists: ${conflict.offerTitle}`,
      });
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
    const { search = "", status } = req.query;
    const query = {
      ...(search && { offerTitle: { $regex: search, $options: "i" } }),
      ...(status && { offerStatus: status }),
    };

    const [offers, total] = await Promise.all([
      Offer.find(query).sort({ createdAt: -1 }),
      Offer.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: offers,
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
    } = req.body;

    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

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
        if (bookingDates.length !== 2) {
          return res.status(400).json({ message: "Invalid bookingDates" });
        }
      }
    } else {
      // bookingDates not in request, keep existing
      bookingDates = offer.offerRedeemTimePeriod;
    }

    // Update fields only if provided (cleaner check vs falsy values)
    if (typeof title === "string") offer.offerTitle = title.trim();
    if (typeof description === "string") offer.offerDescription = description;
    if (offerType !== undefined) offer.offerType = offerType;
    if (discountUnit !== undefined) offer.offerDiscountUnit = discountUnit;
    if (discountValue !== undefined)
      offer.offerDiscountValue = parseFloat(discountValue);
    if (minimumOrderValue !== undefined)
      offer.offerMinimumOrderValue = parseFloat(minimumOrderValue);
    if (typeof imageUrl === "string") offer.offerImageUrl = imageUrl;
    if (bookingDates.length === 2) offer.offerRedeemTimePeriod = bookingDates;
    if (Array.isArray(eligibleItems)) offer.offerEligibleItems = eligibleItems;
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
