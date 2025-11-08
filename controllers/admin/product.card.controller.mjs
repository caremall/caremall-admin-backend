
import mongoose from "mongoose";
import ProductCard from "../../models/productCard.mjs";
import { enrichProductsWithDefaultVariants } from "../../utils/enrichedProducts.mjs";
import Offer from "../../models/offerManagement.mjs";
import Variant  from "../../models/Variant.mjs";
// Create a new ProductCard with linked products
export const createProductCard = async (req, res) => {
  try {
    const { title, buttonText, buttonLinkType, redirectLink, products, active } =
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
      .populate({
        path: "products",
        populate: [
          {
            path: "brand",
            model: "Brand",
            select: "name",
          },
          {
            path: "category",
            model: "Category",
            select: "name",
          },
          {
            path: "defaultVariant",
            model: "Variant",
            select: "variantId images sellingPrice mrpPrice SKU barcode isDefault",
          },
          {
            path: "variants",
            model: "Variant",
            select:
              "variantId images sellingPrice mrpPrice SKU barcode availableQuantity weight dimensions isDefault",
          },
        ],
      })
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
    const now = new Date();

    // === 1. Fetch Active Offers ===
    const offers = await Offer.find({
      offerStatus: "published",
      offerRedeemTimePeriod: { $exists: true, $not: { $size: 0 } },
      "offerRedeemTimePeriod.0": { $lte: now },
      "offerRedeemTimePeriod.1": { $gte: now },
    }).lean();

    const applyDiscount = (price, unit, value) => {
      if (unit === "percentage") return Math.max(0, price - (price * value) / 100);
      if (unit === "fixed") return Math.max(0, price - value);
      return price;
    };

    // === 2. Fetch ProductCards + Populate Products & Variants ===
    const cards = await ProductCard.find({ active: true })
      .populate({
        path: "products",
        match: { productStatus: "published", visibility: "visible" },
        populate: [
          {
            path: "brand",
            model: "Brand",
            select: "brandName", // we only need the name for display (optional)
          },
          {
            path: "category",
            model: "Category",
            select: "name",
          },
          {
            path: "subcategory",
            model: "Category",
            select: "name",
          },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    // === 3. Enrich Products with Default Variants ===
    const enrichedCards = await Promise.all(
      cards.map(async (card) => {
        const rawProducts = card.products || [];
        const enrichedProducts = await enrichProductsWithDefaultVariants(rawProducts);

        // === 4. Load ALL Variants for these products ===
        const productIds = enrichedProducts.map(p => p._id);
        const allVariants = await Variant.find({ productId: { $in: productIds } })
          .select(
            "productId _id variantId variantAttributes SKU barcode images landingSellPrice sellingPrice mrpPrice maximumQuantity isDefault"
          )
          .lean();

        const variantMap = {};
        allVariants.forEach(v => {
          const pid = v.productId?.toString();
          if (!pid) return;
          if (!variantMap[pid]) variantMap[pid] = [];
          variantMap[pid].push(v);
        });

        // === 5. Process Each Product ===
        const processedProducts = [];

        for (const product of enrichedProducts) {
          const pid = product._id.toString();
          const variants = variantMap[pid] || [];

          // Extract string IDs safely
          const brandId = product.brand?._id?.toString() || null;
          const categoryId = product.category?._id?.toString() || null;
          const subcategoryId = product.subcategory?._id?.toString() || null;

          // Replace objects with string IDs
          product.brand = brandId;
          product.category = categoryId;
          product.subcategory = subcategoryId;

          // Default variant
          let defaultVar = null;
          if (product.hasVariant && product.defaultVariant) {
            const defId = product.defaultVariant.toString();
            defaultVar = variants.find(v => v._id.toString() === defId) || null;
          }

          // Images fallback
          const finalImages = product.productImages?.length
            ? product.productImages
            : (defaultVar?.images || []);

          // Base price source
          const getBase = (src) => {
            const landing = src?.landingSellPrice || 0;
            const selling = src?.sellingPrice || 0;
            const mrp = src?.mrpPrice || 0;
            const maxQty = src?.maximumQuantity || 10;
            return { landing, selling, mrp, maxQty, base: landing > 0 ? landing : selling };
          };

          const defSrc = defaultVar ? getBase(defaultVar) : getBase(product);
          const basePrice = defSrc.base;
          const isLanding = defSrc.landing > 0;

          // Apply offers — NOW USING STRING IDs
          let discounted = basePrice;
          const applied = [];
          for (const o of offers) {
            let ok = false;
            if (o.offerType === "product") ok = o.offerEligibleItems.includes(pid);
            else if (o.offerType === "category" && categoryId)
              ok = o.offerEligibleItems.includes(categoryId);
            else if (o.offerType === "brand" && brandId)
              ok = o.offerEligibleItems.includes(brandId);

            if (ok && basePrice >= (o.offerMinimumOrderValue || 0)) {
              const prev = discounted;
              discounted = applyDiscount(discounted, o.offerDiscountUnit, o.offerDiscountValue);
              if (discounted < prev) {
                applied.push({ offerName: o.offerName, discountType: o.offerDiscountUnit, discountValue: o.offerDiscountValue });
              }
            }
          }

          const finalPrice = Math.max(0, discounted);
          const discountPercent = defSrc.mrp > 0 && defSrc.landing > 0
            ? Math.ceil(((defSrc.mrp - defSrc.landing) / defSrc.mrp) * 100)
            : defSrc.mrp > 0 && defSrc.selling > 0
              ? Math.ceil(((defSrc.mrp - defSrc.selling) / defSrc.mrp) * 100)
              : 0;

          // Stock
          let available = 0;
          if (defaultVar) {
            const inv = await mongoose.model("Inventory").findOne({ variant: defaultVar._id }).lean();
            available = inv?.quantity || 0;
          } else {
            const agg = await mongoose.model("Inventory").aggregate([
              { $match: { product: product._id } },
              { $group: { _id: null, total: { $sum: "$quantity" } } },
            ]);
            available = agg[0]?.total || 0;
          }
          const maxAllowed = Math.min(defSrc.maxQty, available);

          const pricing = {
            originalPrice: basePrice,
            discountedPrice: finalPrice,
            totalPrice: finalPrice,
            sellingPrice: defSrc.selling,
            mrpPrice: defSrc.mrp,
            landingSellPrice: defSrc.landing,
            discountPercent,
            isLandingPriceApplied: isLanding,
            appliedOffers: applied,
          };

          // Process variants — FIX: await stock properly
          const processedVariants = await Promise.all(variants.map(async (v) => {
            const src = getBase(v);
            let vDisc = src.base;
            const vApplied = [];

            for (const o of offers) {
              let ok = false;
              if (o.offerType === "product") ok = o.offerEligibleItems.includes(pid);
              else if (o.offerType === "category" && categoryId)
                ok = o.offerEligibleItems.includes(categoryId);
              else if (o.offerType === "brand" && brandId)
                ok = o.offerEligibleItems.includes(brandId);

              if (ok && src.base >= (o.offerMinimumOrderValue || 0)) {
                const prev = vDisc;
                vDisc = applyDiscount(vDisc, o.offerDiscountUnit, o.offerDiscountValue);
                if (vDisc < prev) {
                  vApplied.push({ offerName: o.offerName, discountType: o.offerDiscountUnit, discountValue: o.offerDiscountValue });
                }
              }
            }

            const vFinal = Math.max(0, vDisc);
            const vPct = src.mrp > 0 && src.landing > 0
              ? Math.ceil(((src.mrp - src.landing) / src.mrp) * 100)
              : src.mrp > 0 && src.selling > 0
                ? Math.ceil(((src.mrp - src.selling) / src.mrp) * 100)
                : 0;

            // FIXED: Actually await stock
            const inv = await mongoose.model("Inventory").findOne({ variant: v._id }).lean();
            const vStock = inv?.quantity || 0;

            return {
              _id: v._id,
              variantId: v.variantId,
              variantAttributes: v.variantAttributes,
              SKU: v.SKU,
              barcode: v.barcode,
              images: v.images || [],
              pricing: {
                originalPrice: src.base,
                discountedPrice: vFinal,
                totalPrice: vFinal,
                sellingPrice: src.selling,
                mrpPrice: src.mrp,
                landingSellPrice: src.landing,
                discountPercent: vPct,
                isLandingPriceApplied: src.landing > 0,
                appliedOffers: vApplied,
              },
              landingSellPrice: src.landing,
              offerPrice: vFinal,
              stock: {
                availableQuantity: vStock,
                maxAllowedQuantity: Math.min(v.maximumQuantity || 10, vStock),
                isInStock: vStock > 0,
              },
              isDefault: v.isDefault,
            };
          }));

          processedProducts.push({
            _id: product._id,
            productName: product.productName,
            urlSlug: product.urlSlug,
            thumbnail: product.thumbnail || finalImages[0] || "",
            productImages: finalImages,
            SKU: product.SKU,
            brand: brandId,           // string ID
            category: categoryId,     // string ID
            subcategory: subcategoryId, // string ID
            hasVariant: product.hasVariant,
            landingSellPrice: product.landingSellPrice,
            variants: processedVariants,
            defaultVariant: defaultVar ? {
              _id: defaultVar._id,
              variantAttributes: defaultVar.variantAttributes,
              images: defaultVar.images,
              pricing,
              offerPrice: finalPrice,
              stock: { availableQuantity: available, maxAllowedQuantity: maxAllowed, isInStock: available > 0 },
            } : null,
            pricing,
            offerPrice: finalPrice,
            stock: { availableQuantity: available, maxAllowedQuantity: maxAllowed, isInStock: available > 0 },
          });
        }

        return { ...card, products: processedProducts };
      })
    );

    res.status(200).json({ success: true, data: enrichedCards });

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
    const { title, buttonText, buttonLinkType, redirectLink, products, active } =
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
