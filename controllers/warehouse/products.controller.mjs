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
      variants = [],
    } = req.body;

    const warehouse = req.user.assignedWarehouses._id;

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

    let uploadedImageUrls = [];
    if (productImages) {
      uploadedImageUrls = Array.isArray(productImages)
        ? await uploadBase64Images(productImages, "products/")
        : await uploadBase64Images([productImages], "products/");
    }

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

    const newProduct = await Product.create(productData);

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
          return {
            ...variant,
            SKU: variant.SKU?.trim(),
            barcode: variant.barcode?.trim(),
            images: uploadedVariantImages,
            productId: newProduct._id,
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
    const warehouse = req.user.assignedWarehouses._id;
    const query = { warehouse };

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
    }).populate("brand category variants");

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
      variants = [],
    } = req.body;

    const warehouse = req.user.assignedWarehouses._id;
    const productId = req.params.id;

    // Find product
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Uniqueness checks (name, slug, SKU, barcode)
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
    if (hasVariant === false && SKU && SKU.trim() !== existingProduct.SKU) {
      const dup = await Product.findOne({
        SKU: SKU.trim(),
        _id: { $ne: productId },
      });
      if (dup)
        return res.status(400).json({ message: "This SKU is already in use" });
    }
    if (
      hasVariant === false &&
      barcode &&
      barcode.trim() !== existingProduct.barcode
    ) {
      const dup = await Product.findOne({
        barcode: barcode.trim(),
        _id: { $ne: productId },
      });
      if (dup)
        return res
          .status(400)
          .json({ message: "This Barcode is already in use" });
    }

    // Process images
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
    const updateFields = {};
    if (productName !== undefined)
      updateFields.productName = productName.trim();
    if (shortDescription !== undefined)
      updateFields.shortDescription = shortDescription.trim();
    if (productDescription !== undefined)
      updateFields.productDescription = productDescription.trim();
    if (warrantyPolicy !== undefined)
      updateFields.warrantyPolicy = warrantyPolicy;
    if (brand !== undefined) updateFields.brand = brand;
    if (category !== undefined) updateFields.category = category;
    if (hasVariant !== undefined) updateFields.hasVariant = hasVariant;

    if (hasVariant === false) {
      updateFields.productType = null;
      updateFields.defaultVariant = null;
      if (SKU !== undefined) updateFields.SKU = SKU.trim();
      if (barcode !== undefined)
        updateFields.barcode = barcode ? barcode.trim() : null;
      if (finalProductImages.length > 0)
        updateFields.productImages = finalProductImages;
      if (costPrice !== undefined && costPrice !== null)
        updateFields.costPrice = Number(costPrice);
      if (sellingPrice !== undefined && sellingPrice !== null)
        updateFields.sellingPrice = Number(sellingPrice);
      if (mrpPrice !== undefined && mrpPrice !== null)
        updateFields.mrpPrice = Number(mrpPrice);

      // Calculate landingSellPrice only if sellingPrice is a valid number
      const base =
        sellingPrice !== undefined && sellingPrice !== null
          ? Number(sellingPrice)
          : existingProduct.sellingPrice !== undefined &&
            existingProduct.sellingPrice !== null
          ? Number(existingProduct.sellingPrice)
          : null;
      const taxVal =
        taxRate !== undefined && taxRate !== null
          ? Number(taxRate)
          : existingProduct.taxRate !== undefined &&
            existingProduct.taxRate !== null
          ? Number(existingProduct.taxRate)
          : 0;

      // Only calculate if base is a valid number
      if (base !== null && !isNaN(base) && !isNaN(taxVal)) {
        const taxAmount = (base * taxVal) / 100;
        const landing = Math.ceil(base + taxAmount);
        if (!isNaN(landing) && isFinite(landing)) {
          updateFields.landingSellPrice = landing;
        }
      }
    } else if (hasVariant === true) {
      updateFields.SKU = null;
      updateFields.barcode = null;
      updateFields.productImages = [];
      updateFields.costPrice = null;
      updateFields.sellingPrice = null;
      updateFields.mrpPrice = null;
      updateFields.landingSellPrice = null;
      if (productType !== undefined) updateFields.productType = productType;
      if (defaultVariant !== undefined)
        updateFields.defaultVariant = defaultVariant;
    }

    if (tags !== undefined) updateFields.tags = Array.isArray(tags) ? tags : [];
    if (discountPercent !== undefined)
      updateFields.discountPercent =
        discountPercent === null ? null : Number(discountPercent);
    if (taxRate !== undefined)
      updateFields.taxRate = taxRate === null ? null : Number(taxRate);
    if (productStatus !== undefined) updateFields.productStatus = productStatus;
    if (visibility !== undefined) updateFields.visibility = visibility;
    if (isFeatured !== undefined) updateFields.isFeatured = Boolean(isFeatured);
    if (isPreOrder !== undefined) updateFields.isPreOrder = Boolean(isPreOrder);
    if (availableQuantity !== undefined)
      updateFields.availableQuantity = Number(availableQuantity);
    if (minimumQuantity !== undefined)
      updateFields.minimumQuantity = Number(minimumQuantity);
    if (reorderQuantity !== undefined)
      updateFields.reorderQuantity = Number(reorderQuantity);
    if (maximumQuantity !== undefined)
      updateFields.maximumQuantity = Number(maximumQuantity);
    if (weight !== undefined) updateFields.weight = Number(weight);
    if (dimensions !== undefined) updateFields.dimensions = dimensions;
    if (isFragile !== undefined) updateFields.isFragile = Boolean(isFragile);
    if (shippingClass !== undefined) updateFields.shippingClass = shippingClass;
    if (packageType !== undefined) updateFields.packageType = packageType;
    if (quantityPerBox !== undefined)
      updateFields.quantityPerBox = Number(quantityPerBox);
    if (supplierId !== undefined) updateFields.supplierId = supplierId;
    if (affiliateId !== undefined) updateFields.affiliateId = affiliateId;
    if (externalLinks !== undefined)
      updateFields.externalLinks = Array.isArray(externalLinks)
        ? externalLinks
        : [];
    if (metaTitle !== undefined) updateFields.metaTitle = metaTitle;
    if (metaDescription !== undefined)
      updateFields.metaDescription = metaDescription;
    if (urlSlug !== undefined)
      updateFields.urlSlug = urlSlug.trim().toLowerCase();
    if (viewsCount !== undefined) updateFields.viewsCount = Number(viewsCount);
    if (addedToCartCount !== undefined)
      updateFields.addedToCartCount = Number(addedToCartCount);
    if (wishlistCount !== undefined)
      updateFields.wishlistCount = Number(wishlistCount);
    if (orderCount !== undefined) updateFields.orderCount = Number(orderCount);
    if (warehouse !== undefined) updateFields.warehouse = warehouse;

    Object.assign(existingProduct, updateFields);

    // Wipe non-variant fields if variant product
    if (hasVariant === true) {
      existingProduct.SKU = undefined;
      existingProduct.barcode = undefined;
      existingProduct.productImages = undefined;
      existingProduct.costPrice = undefined;
      existingProduct.sellingPrice = undefined;
      existingProduct.mrpPrice = undefined;
      existingProduct.landingSellPrice = undefined;
    }

    // Recalculate landingSellPrice if variant mode unchanged & non-variant product
    if (hasVariant === undefined && existingProduct.hasVariant === false) {
      const base = existingProduct.sellingPrice;
      const taxVal = existingProduct.taxRate || 0;

      // Ensure base is a valid number before calculation
      if (
        base !== null &&
        base !== undefined &&
        !isNaN(base) &&
        !isNaN(taxVal)
      ) {
        const baseNum = Number(base);
        const taxNum = Number(taxVal);
        const taxAmount = (baseNum * taxNum) / 100;
        const landing = Math.ceil(baseNum + taxAmount);

        if (!isNaN(landing) && isFinite(landing)) {
          existingProduct.landingSellPrice = landing;
        }
      }
    }

    await existingProduct.save();

    // Variant handling...
    if (hasVariant === true && Array.isArray(variants)) {
      const variantIds = variants.map((v) => v._id).filter(Boolean);

      await Variant.deleteMany({ productId, _id: { $nin: variantIds } });

      for (const variant of variants) {
        if (!variant.SKU || variant.SKU.trim() === "") {
          return res.status(400).json({ message: "Variant SKU is required" });
        }

        const cost = Number(variant.costPrice);
        const sell = Number(variant.sellingPrice);
        const mrp = Number(variant.mrpPrice);
        if ([cost, sell, mrp].some((val) => isNaN(val))) {
          return res
            .status(400)
            .json({ message: `Invalid price fields in SKU '${variant.SKU}'` });
        }

        if (
          variants.filter((v) => v.SKU && v.SKU.trim() === variant.SKU.trim())
            .length > 1
        ) {
          return res
            .status(400)
            .json({ message: `Duplicate SKU '${variant.SKU.trim()}'` });
        }

        let processedImages = [];
        if (variant.images && variant.images.length > 0) {
          processedImages = await Promise.all(
            variant.images.map(async (img) => {
              if (
                typeof img === "string" &&
                /^data:image\/[a-zA-Z]+;base64,/.test(img)
              ) {
                const uploaded = await uploadBase64Images(
                  [img],
                  "variant-images/"
                );
                return uploaded[0];
              }
              return img;
            })
          );
          processedImages = processedImages.flat().filter(Boolean);
        }

        const base = Number(variant.sellingPrice);
        const tax = Number(variant.taxRate) || 0;
        let landingPrice;
        if (!isNaN(base) && !isNaN(tax) && isFinite(base) && isFinite(tax)) {
          const taxAmount = (base * tax) / 100;
          landingPrice = Math.ceil(base + taxAmount);
          // Validate the result
          if (isNaN(landingPrice) || !isFinite(landingPrice)) {
            landingPrice = undefined;
          }
        }

        const variantData = {
          productId,
          variantAttributes: variant.variantAttributes || [],
          SKU: variant.SKU.trim(),
          barcode: variant.barcode ? variant.barcode.trim() : undefined,
          costPrice: cost,
          sellingPrice: sell,
          mrpPrice: mrp,
          landingSellPrice: landingPrice,
          discountPercent: variant.discountPercent
            ? Number(variant.discountPercent)
            : undefined,
          taxRate: variant.taxRate ? Number(variant.taxRate) : undefined,
          images:
            processedImages.length > 0 ? processedImages : variant.images || [],
          isDefault: variant.isDefault || false,
        };

        if (variant._id) {
          const existingVariant = await Variant.findById(variant._id);
          if (!existingVariant)
            return res
              .status(404)
              .json({ message: `Variant ID ${variant._id} not found` });

          if (variant.SKU.trim() !== existingVariant.SKU) {
            const dupeSKU = await Variant.findOne({
              SKU: variant.SKU.trim(),
              _id: { $ne: variant._id },
            });
            if (dupeSKU)
              return res
                .status(400)
                .json({ message: `Duplicate SKU ${variant.SKU.trim()}` });
          }

          if (
            variant.barcode &&
            variant.barcode.trim() !== existingVariant.barcode
          ) {
            const dupeBarcode = await Variant.findOne({
              barcode: variant.barcode.trim(),
              _id: { $ne: variant._id },
            });
            if (dupeBarcode)
              return res.status(400).json({
                message: `Duplicate Barcode ${variant.barcode.trim()}`,
              });
          }

          await Variant.findByIdAndUpdate(variant._id, variantData, {
            new: true,
            runValidators: true,
          });
        } else {
          if (
            !variant.variantAttributes ||
            variant.variantAttributes.length === 0
          ) {
            return res.status(400).json({
              message: `Variant ${variant.SKU} requires variantAttributes`,
            });
          }
          const dupeSKU = await Variant.findOne({
            SKU: variantData.SKU,
          });
          if (dupeSKU)
            return res.status(400).json({
              message: `SKU '${variantData.SKU}' already exists`,
            });
          if (variantData.barcode) {
            const dupeBarcode = await Variant.findOne({
              barcode: variantData.barcode,
            });
            if (dupeBarcode)
              return res.status(400).json({
                message: `Barcode '${variantData.barcode}' already exists`,
              });
          }
          await Variant.create(variantData);
        }
      }

      const allVariants = await Variant.find({ productId });
      if (defaultVariant) {
        existingProduct.defaultVariant = defaultVariant;
        await existingProduct.save();
      } else if (allVariants.length > 0 && !existingProduct.defaultVariant) {
        const defaultVar =
          allVariants.find((v) => v.isDefault) || allVariants[0];
        existingProduct.defaultVariant = defaultVar._id;
        await existingProduct.save();
      }
    } else if (hasVariant === false) {
      await Variant.deleteMany({ productId });
    }

    const updatedProduct = await Product.findById(productId)
      .populate("brand")
      .populate("category")
      .populate("productType")
      .populate("warehouse");

    return res.status(200).json({
      success: true,
      message: "Product updated",
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
