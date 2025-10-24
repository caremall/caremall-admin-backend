import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";
import Category from "../../models/Category.mjs";
// import Warehouse from "../../models/Warehouse.mjs";
import { uploadBase64Images } from "../../utils/uploadImage.mjs";
// import Inventory from "../../models/inventory.mjs";
// import ProductType from "../../models/ProductType.mjs";

export const createProduct = async (req, res) => {
  try {
    const {
      productName,
      shortDescription,
      productDescription,
      warrantyPolicy,
      brand,
      category,
      subcategory,
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
      warehouseLocation,
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

    // ---------- VALIDATION ----------
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

    if (hasVariant === false) {
      if (!SKU) missingFields.push("SKU");
      if (!productImages || productImages.length === 0)
        missingFields.push("productImages");
      if (costPrice === undefined) missingFields.push("costPrice");
      if (sellingPrice === undefined) missingFields.push("sellingPrice");
      if (mrpPrice === undefined) missingFields.push("mrpPrice");
    }
    if (hasVariant === true && !productType) missingFields.push("productType");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (await Product.findOne({ productName: productName.trim() })) {
      return res.status(400).json({ message: "Product name is already taken" });
    }
    if (await Product.findOne({ urlSlug: urlSlug.trim() })) {
      return res.status(400).json({ message: "Slug is already taken" });
    }

    if (!hasVariant) {
      if (
        SKU &&
        SKU.trim() !== "" &&
        (await Product.findOne({ SKU: SKU.trim() }))
      ) {
        return res.status(400).json({ message: "This SKU is already in use" });
      }
      if (
        barcode &&
        barcode.trim() !== "" &&
        (await Product.findOne({ barcode: barcode.trim() }))
      ) {
        return res
          .status(400)
          .json({ message: "This Barcode is already in use" });
      }
    }

    if (hasVariant && Array.isArray(variants)) {
      for (const variant of variants) {
        if (!variant.SKU || variant.SKU.trim() === "") {
          return res.status(400).json({
            message: "Each variant must have a valid SKU.",
          });
        }
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

    // ---------- IMAGES ----------
    let uploadedImageUrls = [];
    if (productImages) {
      uploadedImageUrls = Array.isArray(productImages)
        ? await uploadBase64Images(productImages, "products/")
        : await uploadBase64Images([productImages], "products/");
    }

    // ---------- PRODUCT DATA ----------
    const productData = {
      productName: productName.trim(),
      shortDescription: shortDescription.trim(),
      productDescription: productDescription.trim(),
      warrantyPolicy,
      brand,
      category,
      subcategory,
      hasVariant,
      productType,
      SKU: hasVariant ? undefined : SKU ? SKU.trim() : undefined,
      barcode: hasVariant ? undefined : barcode ? barcode.trim() : undefined,
      defaultVariant: defaultVariant || undefined,
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

    // ---------- CALCULATE landingSellPrice FOR PRODUCT ----------
    if (!hasVariant) {
      const base = sellingPrice ?? 0;
      const tax = taxRate ? (base * taxRate) / 100 : 0;
      const discount = discountPercent ? (base * discountPercent) / 100 : 0;
      productData.landingSellPrice = base + tax;
    }

    const newProduct = await Product.create(productData);

    // ---------- VARIANTS ----------
    let createdVariants = [];

    if (hasVariant && Array.isArray(variants) && variants.length > 0) {
      const variantDocs = await Promise.all(
        variants.map(async (variant) => {
          let uploadedVariantImages = [];
          if (variant.images && variant.images.length > 0) {
            uploadedVariantImages = await uploadBase64Images(
              variant.images,
              "variant-images/"
            );
          }

          // compute landingSellPrice for variant
          const base = variant.sellingPrice ?? 0;
          const tax = variant.taxRate ? (base * variant.taxRate) / 100 : 0;
          const discount = variant.discountPercent
            ? (base * variant.discountPercent) / 100
            : 0;

          return {
            ...variant,
            SKU: variant.SKU.trim(),
            barcode: variant.barcode?.trim(),
            images: uploadedVariantImages,
            productId: newProduct._id,
            landingSellPrice: base + tax,
          };
        })
      );

      createdVariants = await Variant.insertMany(variantDocs);

      const defaultVariantDoc = createdVariants.find((v) => v.isDefault);
      if (defaultVariantDoc) {
        newProduct.defaultVariant = defaultVariantDoc._id;
        await newProduct.save();
      }
    }

    // ---------- INVENTORY ----------
    // if (!hasVariant) {
    //   await Inventory.create({
    //     warehouse,
    //     product: newProduct._id,
    //     availableQuantity: availableQuantity || 0,
    //     minimumQuantity: minimumQuantity || 0,
    //     reorderQuantity: reorderQuantity || 0,
    //     maximumQuantity: maximumQuantity || 0,
    //     warehouseLocation: warehouseLocation || null,
    //   });
    // } else if (hasVariant && createdVariants.length > 0) {
    //   for (const createdVariant of createdVariants) {
    //     const inputVariant = variants.find(
    //       (v) =>
    //         v.SKU?.trim() === createdVariant.SKU &&
    //         v.barcode?.trim() === createdVariant.barcode
    //     );
    //     await Inventory.create({
    //       warehouse,
    //       variant: createdVariant._id,
    //       availableQuantity: inputVariant?.availableQuantity || 0,
    //       minimumQuantity: inputVariant?.minimumQuantity || 0,
    //       reorderQuantity: inputVariant?.reorderQuantity || 0,
    //       maximumQuantity: inputVariant?.maximumQuantity || 0,
    //       warehouseLocation: inputVariant?.warehouseLocation || null,
    //     });
    //   }
    // }

    // ---------- RESPONSE ----------
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
      .populate({
        path: "variants",
        select: "SKU images urlSlug",
        populate: {
          path: "inventory",
          select:
            "availableQuantity minimumQuantity reorderQuantity maximumQuantity warehouse warehouseLocation",
          populate: [
            {
              path: "warehouse",
              select: "name address city state country postalCode",
            },
            { path: "warehouseLocation", select: "code name capacity status" },
          ],
        },
      })
      .populate({
        path: "inventory",
        select:
          "availableQuantity minimumQuantity reorderQuantity maximumQuantity warehouse warehouseLocation",
        populate: [
          {
            path: "warehouse",
            select: "name address city state country postalCode",
          },
          { path: "warehouseLocation", select: "code name capacity status" },
        ],
      })
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
    }).populate([
      { path: "brand" },
      { path: "productType" },
      { path: "category" },
      { path: "subcategory" },
      { path: "variants" },
    ]);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let variants = [];
    if (product.hasVariant) {
      variants = await Variant.find({ productId: product._id });
    }

    // Check if productType is populated or null
    const productTypeStatus = product.productType ? "POPULATED" : "NULL/EMPTY";

    console.log("=== PRODUCT TYPE STATUS ===");
    console.log("Product Type:", productTypeStatus);
    if (product.productType) {
      console.log("Product Type Data:", {
        id: product.productType._id,
        name: product.productType.name,
        attributes: product.productType.attributes,
      });
    } else {
      console.log("No product type found for this product");
    }
    console.log("===========================");

    res.status(200).json({
      success: true,
      product,
      variants: product.hasVariant ? variants : [],
      debug: {
        productTypeStatus: productTypeStatus,
        productType: product.productType,
      },
    });
  } catch (err) {
    console.error("Error fetching product by slug:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      productName,
      shortDescription,
      productDescription,
      warrantyPolicy,
      brand,
      category,
      subcategory,
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

    // Find existing product
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Uniqueness checks
    if (productName && productName.trim() !== existingProduct.productName) {
      const dup = await Product.findOne({
        productName: productName.trim(),
        _id: { $ne: productId },
      });
      if (dup)
        return res
          .status(400)
          .json({ message: "Product name is already taken" });
    }

    if (urlSlug && urlSlug.trim().toLowerCase() !== existingProduct.urlSlug) {
      const dup = await Product.findOne({
        urlSlug: urlSlug.trim().toLowerCase(),
        _id: { $ne: productId },
      });
      if (dup)
        return res.status(400).json({ message: "URL slug is already taken" });
    }

    if (hasVariant === false) {
      if (SKU && SKU.trim() !== existingProduct.SKU) {
        const dup = await Product.findOne({
          SKU: SKU.trim(),
          _id: { $ne: productId },
        });
        if (dup)
          return res
            .status(400)
            .json({ message: "This SKU is already in use" });
      }
      if (barcode && barcode.trim() !== existingProduct.barcode) {
        const dup = await Product.findOne({
          barcode: barcode.trim(),
          _id: { $ne: productId },
        });
        if (dup)
          return res
            .status(400)
            .json({ message: "This Barcode is already in use" });
      }
    }

    // Handle product images
    let finalProductImages = existingProduct.productImages || [];
    if (productImages && productImages.length > 0 && hasVariant === false) {
      const promises = productImages.map(async (img) => {
        if (
          typeof img === "string" &&
          /^data:image\/[a-zA-Z]+;base64,/.test(img)
        ) {
          const uploaded = await uploadBase64Images([img], "products/");
          return uploaded[0];
        }
        return img;
      });
      finalProductImages = (await Promise.all(promises)).flat().filter(Boolean);
    }

    // Build update fields
    const updateFields = {
      ...(productName !== undefined && { productName: productName.trim() }),
      ...(shortDescription !== undefined && {
        shortDescription: shortDescription.trim(),
      }),
      ...(productDescription !== undefined && {
        productDescription: productDescription.trim(),
      }),
      ...(warrantyPolicy !== undefined && { warrantyPolicy }),
      ...(brand !== undefined && { brand }),
      ...(category !== undefined && { category }),
      ...(subcategory !== undefined && { subcategory }),
      ...(hasVariant !== undefined && { hasVariant }),
      ...(productType !== undefined && { productType }),
      ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
      ...(discountPercent !== undefined && {
        discountPercent:
          discountPercent === null ? null : Number(discountPercent),
      }),
      ...(taxRate !== undefined && {
        taxRate: taxRate === null ? null : Number(taxRate),
      }),
      ...(productStatus !== undefined && { productStatus }),
      ...(visibility !== undefined && { visibility }),
      ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
      ...(isPreOrder !== undefined && { isPreOrder: Boolean(isPreOrder) }),
      ...(availableQuantity !== undefined && {
        availableQuantity: Number(availableQuantity),
      }),
      ...(minimumQuantity !== undefined && {
        minimumQuantity: Number(minimumQuantity),
      }),
      ...(reorderQuantity !== undefined && {
        reorderQuantity: Number(reorderQuantity),
      }),
      ...(maximumQuantity !== undefined && {
        maximumQuantity: Number(maximumQuantity),
      }),
      ...(weight !== undefined && { weight: Number(weight) }),
      ...(dimensions !== undefined && { dimensions }),
      ...(isFragile !== undefined && { isFragile: Boolean(isFragile) }),
      ...(shippingClass !== undefined && { shippingClass }),
      ...(packageType !== undefined && { packageType }),
      ...(quantityPerBox !== undefined && {
        quantityPerBox: Number(quantityPerBox),
      }),
      ...(supplierId !== undefined && { supplierId }),
      ...(affiliateId !== undefined && { affiliateId }),
      ...(externalLinks !== undefined && {
        externalLinks: Array.isArray(externalLinks) ? externalLinks : [],
      }),
      ...(metaTitle !== undefined && { metaTitle }),
      ...(metaDescription !== undefined && { metaDescription }),
      ...(urlSlug !== undefined && { urlSlug: urlSlug.trim().toLowerCase() }),
      ...(viewsCount !== undefined && { viewsCount: Number(viewsCount) }),
      ...(addedToCartCount !== undefined && {
        addedToCartCount: Number(addedToCartCount),
      }),
      ...(wishlistCount !== undefined && {
        wishlistCount: Number(wishlistCount),
      }),
      ...(orderCount !== undefined && { orderCount: Number(orderCount) }),
      ...(warehouse !== undefined && { warehouse }),
    };

    if (hasVariant === false) {
      // Non-variant product fields
      if (SKU !== undefined) updateFields.SKU = SKU.trim();
      if (barcode !== undefined)
        updateFields.barcode = barcode ? barcode.trim() : null;
      if (productImages && productImages.length > 0)
        updateFields.productImages = finalProductImages;
      if (costPrice !== undefined) updateFields.costPrice = Number(costPrice);
      if (sellingPrice !== undefined)
        updateFields.sellingPrice = Number(sellingPrice);
      if (mrpPrice !== undefined) updateFields.mrpPrice = Number(mrpPrice);

      // Calculate landing price
      const base =
        sellingPrice !== undefined
          ? Number(sellingPrice)
          : existingProduct.sellingPrice;
      const taxVal =
        taxRate !== undefined ? Number(taxRate) : existingProduct.taxRate || 0;
      if (base && !isNaN(base)) {
        updateFields.landingSellPrice = Math.ceil(base + (base * taxVal) / 100);
      }
    } else {
      // Clear single-product fields if variants are used
      updateFields.SKU = null;
      updateFields.barcode = null;
      updateFields.productImages = [];
      updateFields.costPrice = null;
      updateFields.sellingPrice = null;
      updateFields.mrpPrice = null;
      updateFields.landingSellPrice = null;
      if (defaultVariant !== undefined)
        updateFields.defaultVariant = defaultVariant;
    }

    // Apply updates to product
    Object.assign(existingProduct, updateFields);
    await existingProduct.save();

    // Handle variants
    if (hasVariant === true && Array.isArray(variants)) {
      const variantIds = variants.map((v) => v._id).filter(Boolean);
      await Variant.deleteMany({ productId, _id: { $nin: variantIds } });

      for (const variant of variants) {
        if (!variant.SKU || variant.SKU.trim() === "") {
          return res.status(400).json({ message: "Variant SKU is required" });
        }

        // Prepare variant data
        let processedImages = [];
        if (variant.images && variant.images.length > 0) {
          processedImages = await Promise.all(
            variant.images.map(async (img) =>
              typeof img === "string" &&
              /^data:image\/[a-zA-Z]+;base64,/.test(img)
                ? (
                    await uploadBase64Images([img], "variant-images/")
                  )[0]
                : img
            )
          );
        }

        const base = Number(variant.sellingPrice);
        const tax = Number(variant.taxRate) || 0;
        const landing = !isNaN(base)
          ? Math.ceil(base + (base * tax) / 100)
          : null;

        const variantData = {
          productId,
          variantAttributes: variant.variantAttributes || [],
          SKU: variant.SKU.trim(),
          barcode: variant.barcode ? variant.barcode.trim() : undefined,
          costPrice: Number(variant.costPrice),
          sellingPrice: Number(variant.sellingPrice),
          mrpPrice: Number(variant.mrpPrice),
          landingSellPrice: landing,
          discountPercent: variant.discountPercent
            ? Number(variant.discountPercent)
            : undefined,
          taxRate: variant.taxRate ? Number(variant.taxRate) : undefined,
          images:
            processedImages.length > 0 ? processedImages : variant.images || [],
          isDefault: variant.isDefault || false,
        };

        if (variant._id) {
          await Variant.findByIdAndUpdate(variant._id, variantData, {
            new: true,
            runValidators: true,
          });
        } else {
          await Variant.create(variantData);
        }
      }

      const allVariants = await Variant.find({ productId });
      if (defaultVariant) {
        existingProduct.defaultVariant = defaultVariant;
      } else if (allVariants.length > 0 && !existingProduct.defaultVariant) {
        existingProduct.defaultVariant =
          allVariants.find((v) => v.isDefault)?._id || allVariants[0]._id;
      }
      await existingProduct.save();
    } else if (hasVariant === false) {
      await Variant.deleteMany({ productId });
    }

    const updatedProduct = await Product.findById(productId)
      .populate("brand")
      .populate("category")
      .populate("subcategory")
      .populate("productType")
      // .populate("warehouse")
      .populate("variants");

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("Update product error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `Duplicate ${field} found.` });
    }
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: "Validation failed", errors });
    }
    return res
      .status(500)
      .json({ message: "Update failed", error: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // First check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete all variants associated with this product
    const deleteVariantsResult = await Variant.deleteMany({
      productId: productId,
    });

    // Then delete the product
    await Product.findByIdAndDelete(productId);

    res.status(200).json({
      message: "Product and its variants deleted successfully",
      deletedVariantsCount: deleteVariantsResult.deletedCount,
    });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ message: "Server error", error: err.message });
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
        $or: [{ productName: regex }, { SKU: regex }, { barcode: regex }],
        productStatus: "published",
        visibility: "visible",
      })
        .limit(10)
        .select("productName sellingPrice category productImages")
        .lean(),

      Category.find({ name: regex }).limit(10).select("name slug").lean(),
    ]);

    console.log("\n--- Product Suggestions ---");
    products.forEach((product) => {
      console.log({
        thumbnail: product.productImages?.[0] || "No Image",
        name: product.productName,
        price: product.sellingPrice,
        category: product.category?.name || "No Category",
      });
    });

    // Log category suggestions
    console.log("\n--- Category Suggestions ---");
    categories.forEach((category) => {
      console.log({
        name: category.name,
        price: null, // Categories don't have prices
        category: "Category",
      });
    });

    res.status(200).json({ products, categories });
  } catch (err) {
    console.error("Error in getSearchSuggestions:", err);
    res.status(500).json({ message: err.message });
  }
};
