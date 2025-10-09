
import mongoose from "mongoose";
import ProductCard from "../../models/productCard.mjs";

// Create a new ProductCard with linked products
export const createProductCard = async (req, res) => {
  try {
    const { title, buttonText, buttonLinkType, redirectLink, products } =
      req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Optional: Validate products array contains valid ObjectIds
    if (products && !Array.isArray(products)) {
      return res
        .status(400)
        .json({ message: "Products must be an array of product IDs" });
    }

    const newProductCard = await ProductCard.create({
      title,
      buttonText,
      buttonLinkType,
      redirectLink,
      products,
      active
    });

    res
      .status(201)
      .json({ message: "ProductCard created", productCard: newProductCard });
  } catch (error) {
    console.error("Create ProductCard Error:", error);
    res.status(500).json({ message: "Failed to create product card" });
  }
};

// Get all ProductCards with populated products
export const getAllProductCards = async (req, res) => {
  try {
    const cards = await ProductCard.find()
      .populate("products")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: cards });
  } catch (error) {
    console.error("Get All ProductCards Error:", error);
    res.status(500).json({ message: "Failed to fetch product cards" });
  }
};

export const getAllActiveProductCards = async (req, res) => {
  try {
    const cards = await ProductCard.find({ active: true })
      .populate("products")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: cards });
  } catch (error) {
    console.error("Get All ProductCards Error:", error);
    res.status(500).json({ message: "Failed to fetch product cards" });
  }
};

// Get single ProductCard by ID with populated products
export const getProductCardById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ProductCard ID" });
    }

    const card = await ProductCard.findById(id).populate("products").lean();
    if (!card) {
      return res.status(404).json({ message: "ProductCard not found" });
    }

    res.status(200).json({ success: true, data: card });
  } catch (error) {
    console.error("Get ProductCard By ID Error:", error);
    res.status(500).json({ message: "Failed to fetch product card" });
  }
};

// Update ProductCard by ID (including linked products)
export const updateProductCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, buttonText, buttonLinkType, redirectLink, products } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ProductCard ID" });
    }

    const card = await ProductCard.findById(id);
    if (!card) {
      return res.status(404).json({ message: "ProductCard not found" });
    }

    if (title !== undefined) card.title = title;
    if (buttonText !== undefined) card.buttonText = buttonText;
    if (buttonLinkType !== undefined) card.buttonLinkType = buttonLinkType;
    if (redirectLink !== undefined) card.redirectLink = redirectLink;
    if (active !== undefined) card.active = active;
    if (products !== undefined) {
      if (!Array.isArray(products)) {
        return res
          .status(400)
          .json({ message: "Products must be an array of product IDs" });
      }
      card.products = products;
    }

    await card.save();

    // Populate before sending response
    await card.populate("products");

    res.status(200).json({ message: "ProductCard updated", data: card });
  } catch (error) {
    console.error("Update ProductCard Error:", error);
    res.status(500).json({ message: "Failed to update product card" });
  }
};

// Delete ProductCard by ID
export const deleteProductCard = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ProductCard ID" });
    }

    const card = await ProductCard.findById(id);
    if (!card) {
      return res.status(404).json({ message: "ProductCard not found" });
    }

    await ProductCard.findByIdAndDelete(id);

    res.status(200).json({ message: "ProductCard deleted" });
  } catch (error) {
    console.error("Delete ProductCard Error:", error);
    res.status(500).json({ message: "Failed to delete product card" });
  }
};
