import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";
import Category from "../../models/Category.mjs";
import Warehouse from "../../models/Warehouse.mjs";
import { uploadBase64Images } from "../../utils/uploadImage.mjs";
import Inventory from "../../models/inventory.mjs";

export const createProduct = async (req, res) => {
  try {
    const {
      productName,
      shortDescription,
      productDescription,
      warrantyPolicy,
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
            SKU: variant.SKU?.trim(),
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
      { path: "category" },
      { path: "variants" },
      { path: "productType" }, // 👈 populate productType
    ]);

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
      warrantyPolicy,
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

    // ---------- FIND PRODUCT ----------
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ---------- PROCESS IMAGES ----------
    let finalProductImages = [];
    if (productImages && productImages.length > 0) {
      finalProductImages = await Promise.all(
        productImages.map(async (img) => {
          if (typeof img === "string" && /^data:image\/[a-zA-Z]+;base64,/.test(img)) {
            const uploadedUrls = await uploadBase64Images([img], "products/");
            return uploadedUrls;
          }
          return img;
        })
      );
    }

    // ---------- UPDATE PRODUCT FIELDS ----------
    const updateFields = {
      ...(productName && { productName: productName.trim() }),
      ...(shortDescription && { shortDescription: shortDescription.trim() }),
      ...(productDescription && { productDescription: productDescription.trim() }),
      ...(warrantyPolicy && { warrantyPolicy }),
      ...(brand && { brand }),
      ...(category && { category }),
      ...(hasVariant !== undefined && { hasVariant }),
      ...(SKU && !hasVariant && { SKU: SKU.trim() }),
      ...(barcode && !hasVariant && { barcode: barcode.trim() }),
      ...(defaultVariant && { defaultVariant }),
      ...(productType && hasVariant && { productType }),
      ...(finalProductImages.length > 0 && !hasVariant && { productImages: finalProductImages }),
      ...(tags && { tags: Array.isArray(tags) ? tags : [] }),
      ...(costPrice !== undefined && !hasVariant && { costPrice }),
      ...(sellingPrice !== undefined && !hasVariant && { sellingPrice }),
      ...(mrpPrice !== undefined && !hasVariant && { mrpPrice }),
      ...(discountPercent !== undefined && { discountPercent }),
      ...(taxRate !== undefined && { taxRate }),
      ...(productStatus && { productStatus }),
      ...(visibility && { visibility }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(isPreOrder !== undefined && { isPreOrder }),
      ...(availableQuantity !== undefined && { availableQuantity }),
      ...(minimumQuantity !== undefined && { minimumQuantity }),
      ...(reorderQuantity !== undefined && { reorderQuantity }),
      ...(maximumQuantity !== undefined && { maximumQuantity }),
      ...(weight !== undefined && { weight }),
      ...(dimensions && { dimensions }),
      ...(isFragile !== undefined && { isFragile }),
      ...(shippingClass && { shippingClass }),
      ...(packageType && { packageType }),
      ...(quantityPerBox !== undefined && { quantityPerBox }),
      ...(supplierId && { supplierId }),
      ...(affiliateId && { affiliateId }),
      ...(externalLinks && { externalLinks: Array.isArray(externalLinks) ? externalLinks : [] }),
      ...(metaTitle && { metaTitle }),
      ...(metaDescription && { metaDescription }),
      ...(urlSlug && { urlSlug: urlSlug.trim() }),
      ...(viewsCount !== undefined && { viewsCount }),
      ...(addedToCartCount !== undefined && { addedToCartCount }),
      ...(wishlistCount !== undefined && { wishlistCount }),
      ...(orderCount !== undefined && { orderCount }),
      ...(warehouse && { warehouse }),
    };

    Object.assign(existingProduct, updateFields);

    // ---------- CALCULATE landingSellPrice FOR PRODUCT ----------
    if (!hasVariant && costPrice !== undefined) {
      const base = sellingPrice ?? 0;
      const tax = taxRate ? (base * taxRate) / 100 : 0;
      existingProduct.landingSellPrice = base + tax;
    }

    await existingProduct.save();

    // ---------- VARIANTS ----------
    if (hasVariant && Array.isArray(variants)) {
      for (let variant of variants) {
        let processedImages = [];
        if (variant.images && variant.images.length > 0) {
          processedImages = await Promise.all(
            variant.images.map(async (img) => {
              if (typeof img === "string" && /^data:image\/[a-zA-Z]+;base64,/.test(img)) {
                const uploadedUrls = await uploadBase64Images([img], "variant-images/");
                return uploadedUrls;
              }
              return img;
            })
          );
        }

        // Compute landingSellPrice
        const base = variant.sellingPrice ?? 0;
        const tax = variant.taxRate ? (base * variant.taxRate) / 100 : 0;
        const variantData = {
          ...variant,
          images: processedImages.length > 0 ? processedImages : variant.images || [],
          productId,
          landingSellPrice: base + tax,
        };

        if (variant._id) {
          // Fetch existing variant
          const existingVariant = await Variant.findById(variant._id);

          // Only update SKU/Barcode if changed
          if (variant.SKU && variant.SKU.trim() !== existingVariant.SKU) {
            variantData.SKU = variant.SKU.trim();
          } else {
            delete variantData.SKU;
          }

          if (variant.barcode && variant.barcode.trim() !== existingVariant.barcode) {
            variantData.barcode = variant.barcode.trim();
          } else {
            delete variantData.barcode;
          }

          await Variant.findByIdAndUpdate(variant._id, variantData, { new: true });
        } else {
          // New variant
          if (variant.SKU) variantData.SKU = variant.SKU.trim();
          if (variant.barcode) variantData.barcode = variant.barcode.trim();
          await Variant.create(variantData);
        }
      }
    }

    // ---------- UPDATE DEFAULT VARIANT ----------
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
    res.status(500).json({ message: "Failed to update product", error: err.message });
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
