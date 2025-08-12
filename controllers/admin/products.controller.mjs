import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";

export const createProduct = async (req, res) => {
    const {
      productName,
      productDescription,
      brand,
      category,
      hasVariant,
      SKU,
      barcode,
      variants = [],
      urlSlug,
    } = req.body;

    const missingFields = [];
    if (!productName || productName.trim() === "")
      missingFields.push("productName");
    if (!urlSlug || urlSlug.trim() === "") missingFields.push("urlSlug");
    if (!productDescription || productDescription.trim() === "")
      missingFields.push("productDescription");
    if (!brand || brand.trim() === "") missingFields.push("brand");
    if (!category || category.trim() === "") missingFields.push("category");

    if (missingFields.length > 0) {
      return res
        .status(200)
        .json({
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
    }

    const nameExists = await Product.findOne({
      productName: productName.trim(),
    });
    if (nameExists) {
      return res.status(200).json({ message: "Product name is already taken" });
    }
    const slugExist = await Product.findOne({ urlSlug: urlSlug.trim() });
    if (slugExist) {
      return res.status(200).json({ message: "Slug is already taken" });
    }

    if (!hasVariant) {
      if (SKU && SKU.trim() !== "") {
        const skuExists = await Product.findOne({ SKU: SKU.trim() });
        if (skuExists)
          return res
            .status(200)
            .json({ message: "This SKU is already in use" });
      }
      if (barcode && barcode.trim() !== "") {
        const barcodeExists = await Product.findOne({
          barcode: barcode.trim(),
        });
        if (barcodeExists)
          return res
            .status(200)
            .json({ message: "This Barcode is already in use" });
      }
    }

    if (hasVariant && Array.isArray(variants)) {
      for (let variant of variants) {
        if (variant.SKU) {
          const exists = await Variant.findOne({ SKU: variant.SKU.trim() });
          if (exists)
            return res
              .status(200)
              .json({
                message: `Variant SKU '${variant.SKU}' is already in use`,
              });
        }
        if (variant.barcode) {
          const exists = await Variant.findOne({
            barcode: variant.barcode.trim(),
          });
          if (exists)
            return res
              .status(200)
              .json({
                message: `Variant Barcode '${variant.barcode}' is already in use`,
              });
        }
      }
    }

    const productData = { ...req.body };

    if (hasVariant) {
      delete productData.SKU;
      delete productData.barcode;
      delete productData.productImages;
      delete productData.costPrice;
      delete productData.sellingPrice;
      delete productData.mrpPrice;
      if (!productData.productType) delete productData.productType;
    } else {
      delete productData.productType;
    }

    ["brand", "category", "productType"].forEach((field) => {
      if (productData[field] === "") delete productData[field];
    });

    const newProduct = await Product.create(productData);

    if (hasVariant && Array.isArray(variants) && variants.length > 0) {
      const variantDocs = variants.map((variant) => ({
        ...variant,
        productId: newProduct._id,
      }));

      const newVariants = await Variant.insertMany(variantDocs);

      const defaultVar = newVariants.find((v) => v.isDefault);
      if (defaultVar) {
        newProduct.defaultVariant = defaultVar._id;
        await newProduct.save();
      }
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct,
    });
};

export const getAllProducts = async (req, res) => {
  try {
    const {
      search,
      brand,
      category,
      visibility,
      status,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 8,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { productDescription: { $regex: search, $options: "i" } },
        { SKU: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }

    if (brand) query.brand = brand;
    if (category) query.category = category;
    if (visibility) query.visibility = visibility;
    if (status) query.productStatus = status;

    if (minPrice || maxPrice) {
      query.sellingPrice = {};
      if (minPrice) query.sellingPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.sellingPrice.$lte = parseFloat(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let sortBy = { createdAt: -1 };
    if (sort) {
      const [field, order] = sort.split(":");
      sortBy = { [field]: order === "asc" ? 1 : -1 };
    }

    const products = await Product.find(query)
      .populate("brand category")
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const productIdsWithVariants = products
      .filter((p) => p.hasVariant && p.defaultVariant)
      .map((p) => p.defaultVariant);

    const defaultVariants = await Variant.find({
      _id: { $in: productIdsWithVariants },
    }).lean();

    const defaultVariantMap = {};
    for (const variant of defaultVariants) {
      defaultVariantMap[variant._id.toString()] = variant;
    }

    const enrichedProducts = products.map((product) => {
      if (product.hasVariant && product.defaultVariant) {
        const variant = defaultVariantMap[product.defaultVariant.toString()];
        if (variant) {
          return {
            ...product,
            SKU: variant.SKU,
            barcode: variant.barcode,
            productImages: variant.images,
            costPrice: variant.costPrice,
            sellingPrice: variant.sellingPrice,
            mrpPrice: variant.mrpPrice,
            discountPercent: variant.discountPercent ?? product.discountPercent,
            taxRate: variant.taxRate ?? product.taxRate,
          };
        }
      }
      return product;
    });

    const total = await Product.countDocuments(query);

    res.status(200).json({
      data: enrichedProducts,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      urlSlug: req.params.slug,
    }).populate("brand category");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let variants = [];
    if (product.hasVariant) {
      variants = await Variant.find({ productId: product._id });
    }

    res.status(200).json({
      success: true,
      product,
      variants: product.hasVariant ? variants : [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const updates = req.body;

    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const {
      hasVariant,
      SKU,
      barcode,
      productImages,
      costPrice,
      sellingPrice,
      mrpPrice,
    } = updates;

    if (hasVariant === false || hasVariant === "false") {
      const missingFields = [];

      if (SKU === undefined || SKU === "") missingFields.push("SKU");
      if (barcode === undefined || barcode === "")
        missingFields.push("barcode");
      if (!productImages || productImages.length === 0)
        missingFields.push("productImages");
      if (costPrice === undefined) missingFields.push("costPrice");
      if (sellingPrice === undefined) missingFields.push("sellingPrice");
      if (mrpPrice === undefined) missingFields.push("mrpPrice");

      if (missingFields.length) {
        return res
          .status(400)
          .json({
            message: `Missing fields for non-variant product: ${missingFields.join(
              ", "
            )}`,
          });
      }
    }

    await Product.findByIdAndUpdate(productId, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, message: "Product updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
