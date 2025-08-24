import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";
import Category from "../../models/Category.mjs";
import Warehouse from "../../models/Warehouse.mjs";
import { uploadBase64Images } from "../../utils/uploadImage.mjs";
export const createProduct = async (req, res) => {
  try {
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
      productImages, // base64 single or array
      productType,
      // other product fields...
    } = req.body;

    // Validate required fields
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
        .status(400)
        .json({
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
    }

    // Check for uniqueness
    if (await Product.findOne({ productName: productName.trim() })) {
      return res.status(400).json({ message: "Product name is already taken" });
    }
    if (await Product.findOne({ urlSlug: urlSlug.trim() })) {
      return res.status(400).json({ message: "Slug is already taken" });
    }

    if (!hasVariant) {
      if (SKU && SKU.trim() !== "") {
        if (await Product.findOne({ SKU: SKU.trim() })) {
          return res
            .status(400)
            .json({ message: "This SKU is already in use" });
        }
      }
      if (barcode && barcode.trim() !== "") {
        if (await Product.findOne({ barcode: barcode.trim() })) {
          return res
            .status(400)
            .json({ message: "This Barcode is already in use" });
        }
      }
    }

    if (hasVariant && Array.isArray(variants)) {
      for (let variant of variants) {
        if (
          variant.SKU &&
          (await Variant.findOne({ SKU: variant.SKU.trim() }))
        ) {
          return res
            .status(400)
            .json({
              message: `Variant SKU '${variant.SKU}' is already in use`,
            });
        }
        if (
          variant.barcode &&
          (await Variant.findOne({ barcode: variant.barcode.trim() }))
        ) {
          return res
            .status(400)
            .json({
              message: `Variant Barcode '${variant.barcode}' is already in use`,
            });
        }
      }
    }

    // Find warehouse managed by user (warehouse manager)
    const managerId = req.user._id;
    const warehouse = await Warehouse.findOne({ manager: managerId });
    if (!warehouse) {
      return res
        .status(403)
        .json({ message: "You do not manage any warehouse." });
    }

    // Upload images to S3 and get URLs
    let uploadedImageUrls = [];
    if (productImages) {
      uploadedImageUrls = await uploadBase64Images(productImages, "products/");
    }

    // Prepare product data
    const productData = {
      productName: productName.trim(),
      productDescription: productDescription.trim(),
      brand,
      category,
      hasVariant,
      SKU: hasVariant ? undefined : SKU ? SKU.trim() : undefined,
      barcode: hasVariant ? undefined : barcode ? barcode.trim() : undefined,
      productImages: hasVariant ? undefined : uploadedImageUrls,
      urlSlug: urlSlug.trim(),
      productType: hasVariant ? productType : undefined,
      warehouse: warehouse._id, // link product to warehouse
      // add other optional fields from req.body if needed
    };

    // Create product
    const newProduct = await Product.create(productData);

    // Create variants if any
    if (hasVariant && Array.isArray(variants) && variants.length > 0) {
      const variantDocs = variants.map((variant) => ({
        ...variant,
        SKU: variant.SKU?.trim(),
        barcode: variant.barcode?.trim(),
        productId: newProduct._id,
      }));

      const createdVariants = await Variant.insertMany(variantDocs);

      const defaultVariant = createdVariants.find((v) => v.isDefault);
      if (defaultVariant) {
        newProduct.defaultVariant = defaultVariant._id;
        await newProduct.save();
      }
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully and linked to your warehouse",
      product: newProduct,
    });
  } catch (err) {
    console.error("Create product error:", err);
    res
      .status(500)
      .json({ message: "Failed to create product", error: err.message });
  }
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

    let sortBy = { createdAt: -1 };
    if (sort) {
      const [field, order] = sort.split(":");
      sortBy = { [field]: order === "asc" ? 1 : -1 };
    }

    const products = await Product.find(query)
      .populate("brand category defaultVariant")
      .sort(sortBy)
      .lean();

    res.status(200).json(products);
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
    const updates = { ...req.body };

    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const {
      hasVariant,
      SKU,
      barcode,
      productImages,
      productName,
      urlSlug,
      costPrice,
      sellingPrice,
      mrpPrice,
    } = updates;

    // For non-variant products validate required fields
    if (hasVariant === false || hasVariant === "false") {
      const missingFields = [];

      if (!SKU || SKU.trim() === "") missingFields.push("SKU");
      if (!barcode || barcode.trim() === "") missingFields.push("barcode");
      if (!productImages || productImages.length === 0)
        missingFields.push("productImages");
      if (costPrice === undefined) missingFields.push("costPrice");
      if (sellingPrice === undefined) missingFields.push("sellingPrice");
      if (mrpPrice === undefined) missingFields.push("mrpPrice");

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Missing fields for non-variant product: ${missingFields.join(
            ", "
          )}`,
        });
      }
    }

    // Check unique productName if updated
    if (productName && productName.trim() !== existingProduct.productName) {
      const exists = await Product.findOne({ productName: productName.trim() });
      if (exists) {
        return res.status(400).json({ message: "Product name already taken" });
      }
    }

    // Check unique urlSlug if updated
    if (urlSlug && urlSlug.trim() !== existingProduct.urlSlug) {
      const exists = await Product.findOne({ urlSlug: urlSlug.trim() });
      if (exists) {
        return res.status(400).json({ message: "Slug already taken" });
      }
    }

    // Check SKU uniqueness for non-variant products if updated
    if (
      (hasVariant === false || hasVariant === "false") &&
      SKU &&
      SKU.trim() !== existingProduct.SKU
    ) {
      const exists = await Product.findOne({ SKU: SKU.trim() });
      if (exists) {
        return res.status(400).json({ message: "SKU already in use" });
      }
    }

    // Check barcode uniqueness for non-variant products if updated
    if (
      (hasVariant === false || hasVariant === "false") &&
      barcode &&
      barcode.trim() !== existingProduct.barcode
    ) {
      const exists = await Product.findOne({ barcode: barcode.trim() });
      if (exists) {
        return res.status(400).json({ message: "Barcode already in use" });
      }
    }

    // If productImages contains base64 strings, upload and replace with URLs
    if (productImages && productImages.length > 0) {
      const uploadedImageUrls = await uploadBase64Images(
        productImages,
        "products/"
      );
      updates.productImages = uploadedImageUrls;
    }

    // Clean empty string fields in fields with condition
    ["brand", "category", "productType"].forEach((field) => {
      if (updates[field] === "") delete updates[field];
    });

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(productId, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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



export const getSearchSuggestions = async (req, res) => {
  try {
    const search = (req.query.q || "").trim();
    if (!search) return res.status(200).json({ products: [], categories: [] });

    console.log("Search query:", search);

    const regex = new RegExp(search, "i");

    const [products, categories] = await Promise.all([
      Product.find({
        $or: [
          { productName: regex },
          { SKU: regex },
          { barcode: regex }
        ],
        productStatus: "published",
        visibility: "visible"
      })
        .limit(10)
        .select("productName sellingPrice category productImages")
        .lean(),
      
     

      Category.find({ name: regex }) 
        .limit(10)
        .select("name slug")
        .lean()
    ]);

        console.log("\n--- Product Suggestions ---");
    products.forEach(product => {
      console.log({
        thumbnail: product.productImages?.[0] || "No Image",
        name: product.productName,
        price: product.sellingPrice,
        category: product.category?.name || "No Category"
      });
    });

    // Log category suggestions
    console.log("\n--- Category Suggestions ---");
    categories.forEach(category => {
      console.log({
        name: category.name,
        price: null, // Categories don't have prices
        category: "Category"
      });
    });

    res.status(200).json({ products, categories });
  } catch (err) {
    console.error("Error in getSearchSuggestions:", err);
    res.status(500).json({ message: err.message });
  }
};
