
import mongoose from "mongoose";
import OfferCard from "./offerCard.mjs";
import { uploadBase64Image } from "../utils/uploadImage.mjs";
import Product from "./Product.mjs";
import Variant from "./Variant.mjs";

// Create a new OfferCard
export const createOfferCard = async (req, res) => {
  try {
    const { title, offerPreviewType, offers, carouselSettings, image } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    let imageUrl = "";
    if (image) {
      imageUrl = await uploadBase64Image(image, "offer-card-images/");
    }
    if (!offerPreviewType) {
      return res
        .status(400)
        .json({ message: "Offer preview type is required" });
    }
    if (!Array.isArray(offers) || offers.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one offer ID is required" });
    }

    const newOfferCard = await OfferCard.create({
      title,
      offerPreviewType,
      offers,
      carouselSettings,
      image: imageUrl
    });

    res
      .status(201)
      .json({ message: "OfferCard created", offerCard: newOfferCard });
  } catch (error) {
    console.error("Create OfferCard Error:", error);
    res.status(500).json({ message: "Failed to create offer card" });
  }
};

// Get all OfferCards with populated offers
export const getAllOfferCards = async (req, res) => {
  try {
    const cards = await OfferCard.find()
      .populate("offers")
      .sort({ createdAt: -1 })
      .lean();

    for (const card of cards) {
      for (const offer of card.offers) {
        if (
          !offer.offerEligibleItems ||
          offer.offerEligibleItems.length === 0
        ) {
          offer.products = [];
          continue;
        }

        const ids = offer.offerEligibleItems.filter((id) =>
          mongoose.Types.ObjectId.isValid(id)
        );

        // Fetch products and variants in parallel by all IDs
        const [products, variants] = await Promise.all([
          Product.find({ _id: { $in: ids } }).lean(),
          Variant.find({ _id: { $in: ids } }).lean(),
        ]);

        // Combine both arrays into one
        offer.products = products.concat(variants);
      }
    }

    res.status(200).json({ success: true, data: cards });
  } catch (error) {
    console.error("Get All OfferCards Error:", error);
    res.status(500).json({ message: "Failed to fetch offer cards" });
  }
};


// Get a single OfferCard by ID with populated offers
export const getOfferCardById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid OfferCard ID" });
    }

    const card = await OfferCard.findById(id)
      .populate({
        path: "offers",
        populate: {
          path: "offerEligibleItems",
          model: "Product",
          select: "productId productName shortDescription productDescription brand category sellingPrice mrpPrice productImages urlSlug hasVariant defaultVariant",
          populate: [
            {
              path: "brand",
              model: "Brand",
              select: "name"
            },
            {
              path: "category", 
              model: "Category",
              select: "name"
            },
            {
              path: "defaultVariant",
              model: "Variant",
              select: "varientId variantName sellingPrice mrpPrice productImages sku barcode"
            },
            {
              path: "variants",
              model: "Variant",
              select: "variantName sellingPrice mrpPrice productImages sku barcode availableQuantity weight dimensions isDefault"
            }
          ]
        }
      })
      .lean();

    if (!card) {
      return res.status(404).json({ success: false, message: "OfferCard not found" });
    }

    // Process products to handle variants
    if (card.offers && card.offers.length > 0) {
      card.offers = card.offers.map(offer => {
        if (offer.offerEligibleItems && offer.offerEligibleItems.length > 0) {
          offer.offerEligibleItems = offer.offerEligibleItems.map(product => {
            // Use default variant data if available
            if (product.hasVariant && product.defaultVariant) {
              const variantData = product.defaultVariant;
              console.log(variantData,'this is variant fata')
              
              return {
                ...product,
                sellingPrice: variantData.sellingPrice,
                mrpPrice: variantData.mrpPrice,
                productImages: variantData.productImages?.length > 0 
                  ? variantData.productImages 
                  : product.productImages,
                sku: variantData.sku,
                barcode: variantData.barcode,
                availableQuantity: variantData.availableQuantity,
                weight: variantData.weight,
                dimensions: variantData.dimensions,
                variantDetails: variantData,
                isUsingVariantData: true
              };
            }
            
            return {
              ...product,
              isUsingVariantData: false
            };
          });
        }
        return offer;
      });
    }

    res.status(200).json({ 
      success: true, 
      data: card 
    });
  } catch (error) {
    console.error("Get OfferCard By ID Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch offer card",
      error: error.message 
    });
  }
};

// Update OfferCard by ID
export const updateOfferCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, offerPreviewType, offers, carouselSettings, image } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid OfferCard ID" });
    }

    const card = await OfferCard.findById(id);
    if (!card) {
      return res.status(404).json({ message: "OfferCard not found" });
    }

    if (title !== undefined) card.title = title;
    if (offerPreviewType !== undefined)
      card.offerPreviewType = offerPreviewType;
    if (offers !== undefined) {
      if (!Array.isArray(offers)) {
        return res
          .status(400)
          .json({ message: "Offers must be an array of offer IDs" });
      }
      card.offers = offers;
    }
    if (carouselSettings !== undefined)
      card.carouselSettings = carouselSettings;

    // if (image) {
    //   const imageUrl = await uploadBase64Image(image, "offer-card-images/");
    //   card.image = imageUrl;
    // }

    if (image) {
      if (typeof image === "string" && image.startsWith("data:image/")) {
        // base64 → upload
        const imageUrl = await uploadBase64Image(image, "offer-card-images/");
        card.image = imageUrl;
      } else {
        // assume it's a valid URL
        card.image = image;
      }
    }

    await card.save();

    await card.populate("offers");

    res.status(200).json({ message: "OfferCard updated", data: card });
  } catch (error) {
    console.error("Update OfferCard Error:", error);
    res.status(500).json({ message: "Failed to update offer card" });
  }
};

// Delete OfferCard by ID
export const deleteOfferCard = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid OfferCard ID" });
    }

    const card = await OfferCard.findById(id);
    if (!card) {
      return res.status(404).json({ message: "OfferCard not found" });
    }

    await OfferCard.findByIdAndDelete(id);

    res.status(200).json({ message: "OfferCard deleted" });
  } catch (error) {
    console.error("Delete OfferCard Error:", error);
    res.status(500).json({ message: "Failed to delete offer card" });
  }
};
