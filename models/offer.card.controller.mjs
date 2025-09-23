
import mongoose from "mongoose";
import OfferCard from "./offerCard.mjs";
import { uploadBase64Image } from "../utils/uploadImage.mjs";

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
      return res.status(400).json({ message: "Invalid OfferCard ID" });
    }

    const card = await OfferCard.findById(id).populate("offers").lean();
    if (!card) {
      return res.status(404).json({ message: "OfferCard not found" });
    }

    res.status(200).json({ success: true, data: card });
  } catch (error) {
    console.error("Get OfferCard By ID Error:", error);
    res.status(500).json({ message: "Failed to fetch offer card" });
  }
};

// Update OfferCard by ID
export const updateOfferCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, offerPreviewType, offers, carouselSettings } = req.body;

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
    if (image) {
      const imageUrl = await uploadBase64Image(image, "offer-card-images/");
      card.image = imageUrl;
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
