import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";
import Category from "../../models/Category.mjs";
import Warehouse from "../../models/Warehouse.mjs";
import { uploadBase64Images } from "../../utils/uploadImage.mjs";
export const createProduct = async (req, res) => {
  try {
    // Grab all product fields from req.body
    const {
      productName,
      shortDescription,
      productDescription,
      brand,
      category,
      hasVariant,
      SKU,
      barcode,
      defaultVariant,
      productType,
      productImages,
      tags,
      costPrice,
      sellingPrice,
      mrpPrice,
      discountPercent,
      taxRate,
      productStatus,
      visibility,
      isFeatured,
      isPreOrder,
      availableQuantity,
      minimumQuantity,
      reorderQuantity,
      maximumQuantity,
      weight,
      dimensions,
      isFragile,
      shippingClass,
      packageType,
      quantityPerBox,
      supplierId,
      affiliateId,
      externalLinks,
      metaTitle,
      metaDescription,
      urlSlug,
      viewsCount,
      addedToCartCount,
      wishlistCount,
      orderCount,
      warehouse, // direct warehouse id
      variants = [],
    } = req.body;

    // Validate required fields (all cases)
    const missingFields = [];
    if (!productName || productName.trim() === "")
      missingFields.push("productName");
    if (!shortDescription || shortDescription.trim() === "")
      missingFields.push("shortDescription");
    if (!productDescription || productDescription.trim() === "")
      missingFields.push("productDescription");
    if (!brand) missingFields.push("brand");
    if (!category) missingFields.push("category");
    if (!urlSlug || urlSlug.trim() === "") missingFields.push("urlSlug");
    if (typeof hasVariant !== "boolean") missingFields.push("hasVariant");

    // Required only if non-variant
    if (hasVariant === false) {
      if (!SKU) missingFields.push("SKU");
      if (!productImages || productImages.length === 0)
        missingFields.push("productImages");
      if (costPrice === undefined) missingFields.push("costPrice");
      if (sellingPrice === undefined) missingFields.push("sellingPrice");
      if (mrpPrice === undefined) missingFields.push("mrpPrice");
    }

    // Required only if variant
    if (hasVariant === true) {
      if (!productType) missingFields.push("productType");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Uniqueness checks
    if (await Product.findOne({ productName: productName.trim() })) {
      return res.status(400).json({ message: "Product name is already taken" });
    }
    if (await Product.findOne({ urlSlug: urlSlug.trim() })) {
      return res.status(400).json({ message: "Slug is already taken" });
    }

    // Check non-variant product's SKU/barcode
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

    // Check variants SKUs/barcodes
    if (hasVariant && Array.isArray(variants)) {
      for (let variant of variants) {
        if (
          variant.SKU &&
          (await Variant.findOne({ SKU: variant.SKU.trim() }))
        ) {
          return res.status(400).json({
            message: `Variant SKU '${variant.SKU}' is already in use`,
          });
        }
        if (
          variant.barcode &&
          (await Variant.findOne({ barcode: variant.barcode.trim() }))
        ) {
          return res.status(400).json({
            message: `Variant Barcode '${variant.barcode}' is already in use`,
          });
        }
      }
    }

    // Upload images if any
    let uploadedImageUrls = [];
    if (productImages) {
      uploadedImageUrls = Array.isArray(productImages)
        ? await uploadBase64Images(productImages, "products/")
        : await uploadBase64Images([productImages], "products/");
    }

    // Prepare productData (all fields)
    const productData = {
      productName: productName.trim(),
      shortDescription: shortDescription.trim(),
      productDescription: productDescription.trim(),
      brand,
      category,
      hasVariant,
      SKU: hasVariant ? undefined : SKU ? SKU.trim() : undefined,
      barcode: hasVariant ? undefined : barcode ? barcode.trim() : undefined,
      defaultVariant: defaultVariant || undefined,
      productType: hasVariant ? productType : undefined,
      productImages: hasVariant ? undefined : uploadedImageUrls,
      tags: Array.isArray(tags) ? tags : [],
      costPrice: hasVariant ? undefined : costPrice,
      sellingPrice: hasVariant ? undefined : sellingPrice,
      mrpPrice: hasVariant ? undefined : mrpPrice,
      discountPercent,
      taxRate,
      productStatus: productStatus || "draft",
      visibility: visibility || "visible",
      isFeatured: !!isFeatured,
      isPreOrder: !!isPreOrder,
      availableQuantity,
      minimumQuantity,
      reorderQuantity,
      maximumQuantity,
      weight,
      dimensions,
      isFragile,
      shippingClass,
      packageType,
      quantityPerBox,
      supplierId,
      affiliateId,
      externalLinks: Array.isArray(externalLinks) ? externalLinks : [],
      metaTitle,
      metaDescription,
      urlSlug: urlSlug.trim(),
      viewsCount,
      addedToCartCount,
      wishlistCount,
      orderCount,
      warehouse: warehouse || undefined,
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

      const defaultVariantDoc = createdVariants.find((v) => v.isDefault);
      if (defaultVariantDoc) {
        newProduct.defaultVariant = defaultVariantDoc._id;
        await newProduct.save();
      }
    }

    res.status(201).json({
      success: true,
      message: "Product created successfully",
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
    const {
      productName,
      shortDescription,
      productDescription,
      brand,
      category,
      hasVariant,
      SKU,
      barcode,
      defaultVariant,
      productType,
      productImages,
      tags,
      costPrice,
      sellingPrice,
      mrpPrice,
      discountPercent,
      taxRate,
      productStatus,
      visibility,
      isFeatured,
      isPreOrder,
      availableQuantity,
      minimumQuantity,
      reorderQuantity,
      maximumQuantity,
      weight,
      dimensions,
      isFragile,
      shippingClass,
      packageType,
      quantityPerBox,
      supplierId,
      affiliateId,
      externalLinks,
      metaTitle,
      metaDescription,
      urlSlug,
      viewsCount,
      addedToCartCount,
      wishlistCount,
      orderCount,
      warehouse,
      variants = [],
    } = req.body;

    const productId = req.params.id;

    // Find product; return error if not found
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Uniqueness checks for productName, urlSlug, SKU, barcode (avoid current product)
    if (productName && productName.trim() !== existingProduct.productName) {
      if (
        await Product.findOne({
          productName: productName.trim(),
          _id: { $ne: productId },
        })
      ) {
        return res
          .status(400)
          .json({ message: "Product name is already taken" });
      }
    }
    if (urlSlug && urlSlug.trim() !== existingProduct.urlSlug) {
      if (
        await Product.findOne({
          urlSlug: urlSlug.trim(),
          _id: { $ne: productId },
        })
      ) {
        return res.status(400).json({ message: "Slug is already taken" });
      }
    }
    if (!hasVariant && SKU && SKU.trim() !== existingProduct.SKU) {
      if (await Product.findOne({ SKU: SKU.trim(), _id: { $ne: productId } })) {
        return res.status(400).json({ message: "SKU is already in use" });
      }
    }
    if (!hasVariant && barcode && barcode.trim() !== existingProduct.barcode) {
      if (
        await Product.findOne({
          barcode: barcode.trim(),
          _id: { $ne: productId },
        })
      ) {
        return res.status(400).json({ message: "Barcode is already in use" });
      }
    }

    // Uniqueness check for variant SKUs/barcodes (avoid current variant id)
    if (hasVariant && Array.isArray(variants)) {
      for (let variant of variants) {
        if (variant.SKU) {
          const exists = await Variant.findOne({
            SKU: variant.SKU.trim(),
            _id: { $ne: variant._id },
          });
          if (exists) {
            return res
              .status(400)
              .json({
                message: `Variant SKU '${variant.SKU}' is already in use`,
              });
          }
        }
        if (variant.barcode) {
          const exists = await Variant.findOne({
            barcode: variant.barcode.trim(),
            _id: { $ne: variant._id },
          });
          if (exists) {
            return res
              .status(400)
              .json({
                message: `Variant Barcode '${variant.barcode}' is already in use`,
              });
          }
        }
      }
    }

    // Update productImages if provided
    let uploadedImageUrls = null;
    if (productImages) {
      uploadedImageUrls = Array.isArray(productImages)
        ? await uploadBase64Images(productImages, "products/")
        : await uploadBase64Images([productImages], "products/");
    }

    // Update the product with provided fields (omit undefined)
    const updateFields = {
      ...(productName !== undefined && { productName: productName.trim() }),
      ...(shortDescription !== undefined && {
        shortDescription: shortDescription.trim(),
      }),
      ...(productDescription !== undefined && {
        productDescription: productDescription.trim(),
      }),
      ...(brand !== undefined && { brand }),
      ...(category !== undefined && { category }),
      ...(hasVariant !== undefined && { hasVariant }),
      ...(SKU !== undefined &&
        !hasVariant && { SKU: SKU ? SKU.trim() : undefined }),
      ...(barcode !== undefined &&
        !hasVariant && { barcode: barcode ? barcode.trim() : undefined }),
      ...(defaultVariant !== undefined && { defaultVariant }),
      ...(productType !== undefined && hasVariant && { productType }),
      ...(uploadedImageUrls !== null &&
        !hasVariant && { productImages: uploadedImageUrls }),
      ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
      ...(costPrice !== undefined && !hasVariant && { costPrice }),
      ...(sellingPrice !== undefined && !hasVariant && { sellingPrice }),
      ...(mrpPrice !== undefined && !hasVariant && { mrpPrice }),
      ...(discountPercent !== undefined && { discountPercent }),
      ...(taxRate !== undefined && { taxRate }),
      ...(productStatus !== undefined && { productStatus }),
      ...(visibility !== undefined && { visibility }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(isPreOrder !== undefined && { isPreOrder }),
      ...(availableQuantity !== undefined && { availableQuantity }),
      ...(minimumQuantity !== undefined && { minimumQuantity }),
      ...(reorderQuantity !== undefined && { reorderQuantity }),
      ...(maximumQuantity !== undefined && { maximumQuantity }),
      ...(weight !== undefined && { weight }),
      ...(dimensions !== undefined && { dimensions }),
      ...(isFragile !== undefined && { isFragile }),
      ...(shippingClass !== undefined && { shippingClass }),
      ...(packageType !== undefined && { packageType }),
      ...(quantityPerBox !== undefined && { quantityPerBox }),
      ...(supplierId !== undefined && { supplierId }),
      ...(affiliateId !== undefined && { affiliateId }),
      ...(externalLinks !== undefined && {
        externalLinks: Array.isArray(externalLinks) ? externalLinks : [],
      }),
      ...(metaTitle !== undefined && { metaTitle }),
      ...(metaDescription !== undefined && { metaDescription }),
      ...(urlSlug !== undefined && { urlSlug: urlSlug.trim() }),
      ...(viewsCount !== undefined && { viewsCount }),
      ...(addedToCartCount !== undefined && { addedToCartCount }),
      ...(wishlistCount !== undefined && { wishlistCount }),
      ...(orderCount !== undefined && { orderCount }),
      ...(warehouse !== undefined && { warehouse }),
    };

    // Update the product
    Object.assign(existingProduct, updateFields);
    await existingProduct.save();

    // Handle variants update if provided (create/update/delete as needed)
    if (hasVariant && Array.isArray(variants)) {
      for (let variant of variants) {
        if (variant._id) {
          // Update existing variant
          await Variant.findByIdAndUpdate(
            variant._id,
            {
              ...variant,
              SKU: variant.SKU?.trim(),
              barcode: variant.barcode?.trim(),
              productId: productId,
            },
            { new: true }
          );
        } else {
          // New variant
          await Variant.create({
            ...variant,
            SKU: variant.SKU?.trim(),
            barcode: variant.barcode?.trim(),
            productId: productId,
          });
        }
      }
      // Optionally delete variants omitted from input (if desired—add logic if needed)
    }

    // Update defaultVariant on product if re-defined
    if (defaultVariant) {
      existingProduct.defaultVariant = defaultVariant;
      await existingProduct.save();
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: existingProduct,
    });
  } catch (err) {
    console.error("Update product error:", err);
    res
      .status(500)
      .json({ message: "Failed to update product", error: err.message });
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
