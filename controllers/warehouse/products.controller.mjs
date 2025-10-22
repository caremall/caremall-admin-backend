import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";
import Category from "../../models/Category.mjs";
import Warehouse from "../../models/Warehouse.mjs";
import { uploadBase64Images } from "../../utils/uploadImage.mjs";
import Inventory from "../../models/inventory.mjs";

export const createProduct = async (req, res) => {
  console.log(req.body.subcategory, 'this is the subcategory');
  
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
      isPreorder, 
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
      // Quantity fields
      minimumQuantity,
      reorderQuantity,
      maximumQuantity,
      variants = [],
    } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!productName?.trim()) missingFields.push("productName");
    if (!shortDescription?.trim()) missingFields.push("shortDescription");
    if (!productDescription?.trim()) missingFields.push("productDescription");
    if (!brand) missingFields.push("brand");
    if (!category) missingFields.push("category");
    if (!urlSlug?.trim()) missingFields.push("urlSlug");
    if (typeof hasVariant !== "boolean") missingFields.push("hasVariant");

    if (hasVariant === false) {
      if (!SKU?.trim()) missingFields.push("SKU");
      if (!productImages || productImages.length === 0) missingFields.push("productImages");
      if (costPrice === undefined || costPrice === null) missingFields.push("costPrice");
      if (sellingPrice === undefined || sellingPrice === null) missingFields.push("sellingPrice");
      if (mrpPrice === undefined || mrpPrice === null) missingFields.push("mrpPrice");
    }
    
    if (hasVariant === true && !productType) missingFields.push("productType");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Check for duplicate product name and slug
    const [existingProductName, existingSlug] = await Promise.all([
      Product.findOne({ productName: productName.trim() }),
      Product.findOne({ urlSlug: urlSlug.trim() })
    ]);

    if (existingProductName) {
      return res.status(400).json({ message: "Product name is already taken" });
    }
    if (existingSlug) {
      return res.status(400).json({ message: "Slug is already taken" });
    }

    // Check for duplicate SKU and barcode for non-variant products
    if (!hasVariant) {
      const skuBarcodeChecks = [];
      
      if (SKU?.trim()) {
        skuBarcodeChecks.push(Product.findOne({ SKU: SKU.trim() }));
      }
      if (barcode?.trim()) {
        skuBarcodeChecks.push(Product.findOne({ barcode: barcode.trim() }));
      }

      if (skuBarcodeChecks.length > 0) {
        const [existingSKU, existingBarcode] = await Promise.all(skuBarcodeChecks);
        
        if (existingSKU) {
          return res.status(400).json({ message: "This SKU is already in use" });
        }
        if (existingBarcode) {
          return res.status(400).json({ message: "This Barcode is already in use" });
        }
      }
    }

    // Check for duplicate variant SKU and barcode
    if (hasVariant && Array.isArray(variants) && variants.length > 0) {
      const variantChecks = [];
      
      for (const variant of variants) {
        if (variant.SKU?.trim()) {
          variantChecks.push(Variant.findOne({ SKU: variant.SKU.trim() }));
        }
        if (variant.barcode?.trim()) {
          variantChecks.push(Variant.findOne({ barcode: variant.barcode.trim() }));
        }
      }

      if (variantChecks.length > 0) {
        const results = await Promise.all(variantChecks);
        
        for (let i = 0; i < results.length; i += 2) {
          const existingVariantSKU = results[i];
          const existingVariantBarcode = results[i + 1];
          
          if (existingVariantSKU) {
            const variantIndex = Math.floor(i / 2);
            return res.status(400).json({
              message: `Variant SKU '${variants[variantIndex].SKU}' is already in use`,
            });
          }
          if (existingVariantBarcode) {
            const variantIndex = Math.floor(i / 2);
            return res.status(400).json({
              message: `Variant Barcode '${variants[variantIndex].barcode}' is already in use`,
            });
          }
        }
      }
    }

    // Upload product images for non-variant products
    let uploadedImageUrls = [];
    if (productImages && !hasVariant) {
      try {
        uploadedImageUrls = Array.isArray(productImages)
          ? await uploadBase64Images(productImages, "products/")
          : await uploadBase64Images([productImages], "products/");
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({ 
          message: "Failed to upload product images", 
          error: uploadError.message 
        });
      }
    }

    // Prepare product data - ensure no null values
    const productData = {
      productName: productName.trim(),
      shortDescription: shortDescription.trim(),
      productDescription: productDescription.trim(),
      warrantyPolicy: warrantyPolicy || "",
      brand,
      category,
      subcategory: subcategory || undefined,
      hasVariant,
      productType: productType || undefined,
      SKU: hasVariant ? undefined : (SKU?.trim() || ""),
      barcode: hasVariant ? undefined : (barcode?.trim() || ""),
      defaultVariant: defaultVariant || undefined,
      productImages: hasVariant ? undefined : uploadedImageUrls,
      tags: Array.isArray(tags) ? tags : [],
      costPrice: hasVariant ? undefined : (costPrice || 0),
      sellingPrice: hasVariant ? undefined : (sellingPrice || 0),
      mrpPrice: hasVariant ? undefined : (mrpPrice || 0),
      discountPercent: discountPercent || 0,
      taxRate: taxRate || 0,
      productStatus: productStatus || "draft",
      visibility: visibility || "visible",
      isFeatured: Boolean(isFeatured),
      isPreOrder: Boolean(isPreorder),
      weight: weight || 0,
      dimensions: dimensions || { length: 0, width: 0, height: 0 },
      isFragile: Boolean(isFragile),
      shippingClass: shippingClass || "",
      packageType: packageType || "",
      quantityPerBox: quantityPerBox || 0,
      supplierId: supplierId || "",
      affiliateId: affiliateId || "",
      externalLinks: Array.isArray(externalLinks) ? externalLinks : [],
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
      urlSlug: urlSlug.trim(),
      viewsCount: viewsCount || 0,
      addedToCartCount: addedToCartCount || 0,
      wishlistCount: wishlistCount || 0,
      orderCount: orderCount || 0,
      // Quantity fields
      minimumQuantity: minimumQuantity || 0,
      reorderQuantity: reorderQuantity || 0,
      maximumQuantity: maximumQuantity || 0,
    };

    // Remove undefined fields
    Object.keys(productData).forEach(key => {
      if (productData[key] === undefined) {
        delete productData[key];
      }
    });

    // Create product
    const newProduct = await Product.create(productData);

    let createdVariants = [];

    // Handle variants if exists
    if (hasVariant && Array.isArray(variants) && variants.length > 0) {
      try {
        const variantDocs = await Promise.all(
          variants.map(async (variant) => {
            let uploadedVariantImages = [];
            if (variant.images && variant.images.length > 0) {
              uploadedVariantImages = await uploadBase64Images(
                variant.images,
                "variant-images/"
              );
            }
            
            const variantData = {
              productId: newProduct._id,
              SKU: variant.SKU?.trim() || "",
              barcode: variant.barcode?.trim() || "",
              costPrice: variant.costPrice || 0,
              sellingPrice: variant.sellingPrice || 0,
              mrpPrice: variant.mrpPrice || 0,
              discountPercent: variant.discountPercent || 0,
              taxRate: variant.taxRate || 0,
              images: uploadedVariantImages,
              isDefault: Boolean(variant.isDefault),
              // Variant quantity fields
              minimumQuantity: variant.minimumQuantity || 0,
              reorderQuantity: variant.reorderQuantity || 0,
              maximumQuantity: variant.maximumQuantity || 0,
              variantAttributes: Array.isArray(variant.variantAttributes) ? variant.variantAttributes : [],
            };

            // Remove undefined fields
            Object.keys(variantData).forEach(key => {
              if (variantData[key] === undefined) {
                delete variantData[key];
              }
            });

            return variantData;
          })
        );

        createdVariants = await Variant.insertMany(variantDocs);

        // Set default variant if exists
        const defaultVariantDoc = createdVariants.find((v) => v.isDefault);
        if (defaultVariantDoc) {
          newProduct.defaultVariant = defaultVariantDoc._id;
          await newProduct.save();
        }
      } catch (variantError) {
        await Product.findByIdAndDelete(newProduct._id);
        if (createdVariants.length > 0) {
          await Variant.deleteMany({ _id: { $in: createdVariants.map(v => v._id) } });
        }
        console.error("Variant creation error:", variantError);
        return res.status(500).json({ 
          message: "Failed to create variants", 
          error: variantError.message 
        });
      }
    }

    // Populate the response with necessary data
    const populatedProduct = await Product.findById(newProduct._id)
      .populate('brand')
      .populate('category')
      .populate('subcategory')
      .populate('productType')
      .populate('defaultVariant')

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: populatedProduct,
      variants: createdVariants.length > 0 ? createdVariants : undefined,
    });
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ 
      message: "Failed to create product", 
      error: err.message 
    });
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
   
    // Remove warehouse from query - just create empty query object
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
      .populate("brand category subcategory defaultVariant productType minimumQuantity reorderQuantity maximumQuantity")
      .populate({
        path: "variants",
        select: "SKU barcode images costPrice sellingPrice mrpPrice discountPercent taxRate isDefault variantAttributes minimumQuantity reorderQuantity maximumQuantity",
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
  console.log('ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss')
  console.log('afdoihdaifdhaifhaifhaifhd')
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
    const warehouseStatus = product.warehouse ? "POPULATED" : "NULL/EMPTY";
    
    console.log("=== PRODUCT TYPE & WAREHOUSE STATUS ===");
    console.log("Product Type:", productTypeStatus);
    console.log("Warehouse:", warehouseStatus);
    
    if (product.productType) {
      console.log("Product Type Data:", {
        id: product.productType._id,
        name: product.productType.name,
        attributes: product.productType.attributes
      });
    } else {
      console.log("No product type found for this product");
    }
    
    if (product.warehouse) {
      console.log("Warehouse Data:", {
        id: product.warehouse._id,
        name: product.warehouse.name,
        location: product.warehouse.location,
        // Add other warehouse fields you want to see
      });
    } else {
      console.log("No warehouse assigned to this product");
    }
    
    console.log("Raw warehouse field from product:", product.warehouse);
    console.log("===========================");

    res.status(200).json({
      success: true,
      product,
      variants: product.hasVariant ? variants : [],
      debug: {
        productTypeStatus: productTypeStatus,
        productType: product.productType,
        warehouseStatus: warehouseStatus,
        warehouse: product.warehouse
      }
    });
  } catch (err) {
    console.error("Error fetching product by slug:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// Assumes Product and Variant models are already imported, and uploadBase64Images util exists
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

    const warehouse = req.user?.assignedWarehouses?._id;
    const productId = req.params.id;

    // Early validation for numeric fields
    if (
      (sellingPrice !== undefined && isNaN(Number(sellingPrice))) ||
      (taxRate !== undefined && isNaN(Number(taxRate))) ||
      (costPrice !== undefined && isNaN(Number(costPrice))) ||
      (mrpPrice !== undefined && isNaN(Number(mrpPrice)))
    ) {
      return res.status(400).json({ message: "Invalid numeric values provided for pricing fields" });
    }

    // Helper to compute landing price safely
    const calcLandingPrice = (baseVal, taxVal) => {
      const baseNum = Number(baseVal);
      const taxNum = Number(taxVal || 0);
      if (isNaN(baseNum) || isNaN(taxNum) || !isFinite(baseNum) || !isFinite(taxNum)) {
        return undefined;
      }
      const taxAmount = (baseNum * taxNum) / 100;
      const landing = Math.ceil(baseNum + taxAmount);
      return isFinite(landing) ? landing : undefined;
    };

    // Find product
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // --- Uniqueness checks ---
    if (productName && productName.trim() !== existingProduct.productName) {
      const dup = await Product.findOne({
        productName: productName.trim(),
        _id: { $ne: productId },
      });
      if (dup) {
        return res.status(400).json({ message: "Product name is already taken" });
      }
    }

    if (urlSlug && urlSlug.trim().toLowerCase() !== existingProduct.urlSlug) {
      const dup = await Product.findOne({
        urlSlug: urlSlug.trim().toLowerCase(),
        _id: { $ne: productId },
      });
      if (dup) {
        return res.status(400).json({ message: "URL slug is already taken" });
      }
    }

    if (hasVariant === false && SKU && SKU.trim() !== existingProduct.SKU) {
      const dup = await Product.findOne({
        SKU: SKU.trim(),
        _id: { $ne: productId },
      });
      if (dup) {
        return res.status(400).json({ message: "This SKU is already in use" });
      }
    }

    if (hasVariant === false && barcode && barcode.trim() !== existingProduct.barcode) {
      const dup = await Product.findOne({
        barcode: barcode.trim(),
        _id: { $ne: productId },
      });
      if (dup) {
        return res.status(400).json({ message: "This Barcode is already in use" });
      }
    }

    // --- Process images for non-variant product ---
    let finalProductImages = existingProduct.productImages || [];
    if (productImages && Array.isArray(productImages) && productImages.length > 0 && hasVariant === false) {
      const promises = productImages.map(async (img) => {
        if (typeof img === "string" && /^data:image\/[a-zA-Z]+;base64,/.test(img)) {
          const uploaded = await uploadBase64Images([img], "products/");
          return uploaded[0];
        }
        return img;
      });
      finalProductImages = (await Promise.all(promises)).flat().filter(Boolean);
    }

    // --- Build updateFields safely ---
    const updateFields = {};

    if (productName !== undefined) updateFields.productName = productName?.trim();
    if (shortDescription !== undefined) updateFields.shortDescription = shortDescription?.trim();
    if (productDescription !== undefined) updateFields.productDescription = productDescription?.trim();
    if (warrantyPolicy !== undefined) updateFields.warrantyPolicy = warrantyPolicy;
    if (brand !== undefined) updateFields.brand = brand;
    if (category !== undefined) updateFields.category = category;
    if (hasVariant !== undefined) updateFields.hasVariant = Boolean(hasVariant);

    // Non-variant product fields
    if (hasVariant === false) {
      updateFields.productType = null;
      updateFields.defaultVariant = null;

      if (SKU !== undefined) updateFields.SKU = SKU ? SKU.trim() : null;
      if (barcode !== undefined) updateFields.barcode = barcode ? barcode.trim() : null;
      if (finalProductImages.length > 0) updateFields.productImages = finalProductImages;

      if (costPrice !== undefined && costPrice !== null) updateFields.costPrice = Number(costPrice);
      if (sellingPrice !== undefined && sellingPrice !== null) updateFields.sellingPrice = Number(sellingPrice);
      if (mrpPrice !== undefined && mrpPrice !== null) updateFields.mrpPrice = Number(mrpPrice);

      // Determine taxVal
      const taxVal =
        taxRate !== undefined && taxRate !== null && !isNaN(Number(taxRate))
          ? Number(taxRate)
          : existingProduct.taxRate !== undefined &&
            existingProduct.taxRate !== null &&
            !isNaN(Number(existingProduct.taxRate))
          ? Number(existingProduct.taxRate)
          : 0;
      if (!isNaN(taxVal)) updateFields.taxRate = taxVal;

      // Determine base for landing price
      const base =
        sellingPrice !== undefined && sellingPrice !== null && !isNaN(Number(sellingPrice))
          ? Number(sellingPrice)
          : existingProduct.sellingPrice !== undefined &&
            existingProduct.sellingPrice !== null &&
            !isNaN(Number(existingProduct.sellingPrice))
          ? Number(existingProduct.sellingPrice)
          : undefined;

      // Compute landing price
      const landing = calcLandingPrice(base, taxVal);
      if (landing !== undefined) updateFields.landingSellPrice = landing;
      // If landing is undefined, do not set landingSellPrice to preserve existing value
    } else if (hasVariant === true) {
      // When product has variants, clear product-level pricing fields
      updateFields.SKU = undefined;
      updateFields.barcode = undefined;
      updateFields.productImages = [];
      updateFields.costPrice = undefined;
      updateFields.sellingPrice = undefined;
      updateFields.mrpPrice = undefined;
      updateFields.landingSellPrice = undefined;
      if (productType !== undefined) updateFields.productType = productType;
      if (defaultVariant !== undefined) updateFields.defaultVariant = defaultVariant;
    }

    if (tags !== undefined) updateFields.tags = Array.isArray(tags) ? tags : [];
    if (discountPercent !== undefined) updateFields.discountPercent = discountPercent === null ? null : Number(discountPercent);
    if (taxRate !== undefined) updateFields.taxRate = taxRate === null ? null : Number(taxRate);
    if (productStatus !== undefined) updateFields.productStatus = productStatus;
    if (visibility !== undefined) updateFields.visibility = visibility;
    if (isFeatured !== undefined) updateFields.isFeatured = Boolean(isFeatured);
    if (isPreOrder !== undefined) updateFields.isPreOrder = Boolean(isPreOrder);
    if (availableQuantity !== undefined) updateFields.availableQuantity = Number(availableQuantity);
    if (minimumQuantity !== undefined) updateFields.minimumQuantity = Number(minimumQuantity);
    if (reorderQuantity !== undefined) updateFields.reorderQuantity = Number(reorderQuantity);
    if (maximumQuantity !== undefined) updateFields.maximumQuantity = Number(maximumQuantity);
    if (weight !== undefined) updateFields.weight = Number(weight);
    if (dimensions !== undefined) updateFields.dimensions = dimensions;
    if (isFragile !== undefined) updateFields.isFragile = Boolean(isFragile);
    if (shippingClass !== undefined) updateFields.shippingClass = shippingClass;
    if (packageType !== undefined) updateFields.packageType = packageType;
    if (quantityPerBox !== undefined) updateFields.quantityPerBox = Number(quantityPerBox);
    if (supplierId !== undefined) updateFields.supplierId = supplierId;
    if (affiliateId !== undefined) updateFields.affiliateId = affiliateId;
    if (externalLinks !== undefined) updateFields.externalLinks = Array.isArray(externalLinks) ? externalLinks : [];
    if (metaTitle !== undefined) updateFields.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateFields.metaDescription = metaDescription;
    if (urlSlug !== undefined) updateFields.urlSlug = urlSlug ? urlSlug.trim().toLowerCase() : undefined;
    if (viewsCount !== undefined) updateFields.viewsCount = Number(viewsCount);
    if (addedToCartCount !== undefined) updateFields.addedToCartCount = Number(addedToCartCount);
    if (wishlistCount !== undefined) updateFields.wishlistCount = Number(wishlistCount);
    if (orderCount !== undefined) updateFields.orderCount = Number(orderCount);
    if (warehouse !== undefined) updateFields.warehouse = warehouse;

    // Handle case when hasVariant is undefined and product has no variants
    if (hasVariant === undefined && existingProduct.hasVariant === false) {
      const base =
        existingProduct.sellingPrice !== undefined &&
        existingProduct.sellingPrice !== null &&
        !isNaN(Number(existingProduct.sellingPrice))
          ? Number(existingProduct.sellingPrice)
          : undefined;
      const tax =
        existingProduct.taxRate !== undefined &&
        existingProduct.taxRate !== null &&
        !isNaN(Number(existingProduct.taxRate))
          ? Number(existingProduct.taxRate)
          : 0;
      const landing = calcLandingPrice(base, tax);
      if (landing !== undefined) {
        updateFields.landingSellPrice = landing;
      }
    }

    // Apply updates to existingProduct instance
    Object.assign(existingProduct, updateFields);

    // Save product first
    await existingProduct.save();

    // --- Variant handling ---
    if (hasVariant === true && Array.isArray(variants)) {
      // variantIds included in body: keep, others delete
      const variantIds = variants.map((v) => v._id).filter(Boolean);

      // Remove variants that were deleted client-side
      await Variant.deleteMany({ productId, _id: { $nin: variantIds } });

      // Process each variant
      for (const variant of variants) {
        // Basic validations
        if (!variant.SKU || variant.SKU.trim() === "") {
          return res.status(400).json({ message: "Variant SKU is required" });
        }

        const cost = Number(variant.costPrice);
        const sell = Number(variant.sellingPrice);
        const mrp = Number(variant.mrpPrice);

        if ([cost, sell, mrp].some((val) => isNaN(val))) {
          return res.status(400).json({ message: `Invalid price fields in SKU '${variant.SKU}'` });
        }

        // Ensure unique SKU in payload
        if (variants.filter((v) => v.SKU && v.SKU.trim() === variant.SKU.trim()).length > 1) {
          return res.status(400).json({ message: `Duplicate SKU '${variant.SKU.trim()}' in payload` });
        }

        // Process variant images
        let processedImages = [];
        if (variant.images && Array.isArray(variant.images) && variant.images.length > 0) {
          const imgs = await Promise.all(
            variant.images.map(async (img) => {
              if (typeof img === "string" && /^data:image\/[a-zA-Z]+;base64,/.test(img)) {
                const uploaded = await uploadBase64Images([img], "variant-images/");
                return uploaded[0];
              }
              return img;
            })
          );
          processedImages = imgs.flat().filter(Boolean);
        }

        const tax = variant.taxRate !== undefined && variant.taxRate !== null ? Number(variant.taxRate) : 0;
        const landingPrice = calcLandingPrice(sell, tax);

        const variantData = {
          productId,
          variantAttributes: variant.variantAttributes || [],
          SKU: variant.SKU.trim(),
          barcode: variant.barcode ? variant.barcode.trim() : undefined,
          costPrice: cost,
          sellingPrice: sell,
          mrpPrice: mrp,
          landingSellPrice: landingPrice !== undefined ? landingPrice : undefined,
          discountPercent: variant.discountPercent !== undefined ? Number(variant.discountPercent) : undefined,
          taxRate: !isNaN(tax) ? tax : undefined,
          images: processedImages.length > 0 ? processedImages : variant.images || [],
          isDefault: Boolean(variant.isDefault),
          minimumQuantity: variant.minimumQuantity !== undefined ? Number(variant.minimumQuantity) : undefined,
          reorderQuantity: variant.reorderQuantity !== undefined ? Number(variant.reorderQuantity) : undefined,
          maximumQuantity: variant.maximumQuantity !== undefined ? Number(variant.maximumQuantity) : undefined,
        };

        if (variant._id) {
          // Updating existing variant
          const existingVariant = await Variant.findById(variant._id);
          if (!existingVariant) {
            return res.status(404).json({ message: `Variant ID ${variant._id} not found` });
          }

          if (variant.SKU.trim() !== existingVariant.SKU) {
            const dupeSKU = await Variant.findOne({ SKU: variant.SKU.trim(), _id: { $ne: variant._id } });
            if (dupeSKU) {
              return res.status(400).json({ message: `Duplicate SKU ${variant.SKU.trim()}` });
            }
          }

          if (variant.barcode && variant.barcode.trim() !== existingVariant.barcode) {
            const dupeBarcode = await Variant.findOne({ barcode: variant.barcode.trim(), _id: { $ne: variant._id } });
            if (dupeBarcode) {
              return res.status(400).json({ message: `Duplicate Barcode ${variant.barcode.trim()}` });
            }
          }

          await Variant.findByIdAndUpdate(variant._id, variantData, {
            new: true,
            runValidators: true,
          });
        } else {
          // Creating new variant
          if (!variant.variantAttributes || variant.variantAttributes.length === 0) {
            return res.status(400).json({ message: `Variant ${variant.SKU} requires variantAttributes` });
          }

          // Global SKU/barcode uniqueness checks
          const dupeSKU = await Variant.findOne({ SKU: variantData.SKU });
          if (dupeSKU) {
            return res.status(400).json({ message: `SKU '${variantData.SKU}' already exists` });
          }

          if (variantData.barcode) {
            const dupeBarcode = await Variant.findOne({ barcode: variantData.barcode });
            if (dupeBarcode) {
              return res.status(400).json({ message: `Barcode '${variantData.barcode}' already exists` });
            }
          }

          await Variant.create(variantData);
        }
      }

      // Ensure defaultVariant is set
      const allVariants = await Variant.find({ productId });
      if (defaultVariant) {
        existingProduct.defaultVariant = defaultVariant;
        await existingProduct.save();
      } else if (allVariants.length > 0) {
        const defaultVar = allVariants.find((v) => v.isDefault) || allVariants[0];
        existingProduct.defaultVariant = defaultVar._id;
        await existingProduct.save();
      }
    } else if (hasVariant === false) {
      // Remove variants if product is switched to non-variant
      await Variant.deleteMany({ productId });
    }

    // Return updated product with populates
    const updatedProduct = await Product.findById(productId)
      .populate("brand")
      .populate("category")
      .populate("productType")
      .populate("defaultVariant")
      .populate({ path: "variants" });

    return res.status(200).json({
      success: true,
      message: "Product updated",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("Update product error:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "unknown";
      return res.status(400).json({ message: `Duplicate ${field} found.` });
    }
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: "Validation failed", errors });
    }
    return res.status(500).json({ message: "Update failed", error: err.message });
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
    const deleteVariantsResult = await Variant.deleteMany({ productId: productId });
    
    // Then delete the product
    await Product.findByIdAndDelete(productId);
    
    res.status(200).json({ 
      message: "Product and its variants deleted successfully",
      deletedVariantsCount: deleteVariantsResult.deletedCount
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




// controllers/productController.js - Add this method
// controllers/productController.js
// controllers/productController.js
export const getProductWithInventory = async (req, res) => {
  console.log('HIIIIIIIIIIIIIIIIIIII')
  try {
    const { productId, variantId } = req.params;

    console.log("Received request for:", { productId, variantId });
    console.log("🔍 DEBUG - Received request:");
    console.log("Product ID:", productId);
    console.log("Variant ID:", variantId);
    console.log("User:", req.user ? "Authenticated" : "Not authenticated");

    // Get user's assigned warehouse
    const assignedWarehouses = req.user.assignedWarehouses;
    const fromWarehouse = Array.isArray(assignedWarehouses)
      ? assignedWarehouses[0]?._id
      : assignedWarehouses?._id;

    console.log("User warehouse:", fromWarehouse);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    if (!fromWarehouse) {
      return res.status(400).json({
        success: false,
        message: "No warehouse assigned to user"
      });
    }

    // Get product details
    const product = await Product.findById(productId)
      .populate("brand", "name")
      .populate("category", "name")
      .populate("variants")
      .lean();

    console.log("Product found:", !!product);
    
    if (!product) {
      console.log("Product not found with ID:", productId);
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    let variantData = null;
    let inventoryData = null;

    // If variantId is provided and it's not "undefined", get variant details
    if (variantId && variantId !== "undefined" && variantId !== "null") {
      console.log("Looking for variant:", variantId);
      variantData = await Variant.findById(variantId).lean();
      console.log("Variant found:", !!variantData);
      
      if (!variantData) {
        console.log("Variant not found with ID:", variantId);
        return res.status(404).json({
          success: false,
          message: "Variant not found"
        });
      }

      // Get inventory for this specific variant in user's warehouse
      inventoryData = await Inventory.findOne({
        product: productId,
        variant: variantId,
        warehouse: fromWarehouse
      }).lean();
      console.log("Inventory data found:", !!inventoryData);
    } else {
      // Get inventory for product without variant in user's warehouse
      inventoryData = await Inventory.findOne({
        product: productId,
        variant: { $in: [null, undefined] },
        warehouse: fromWarehouse
      }).lean();
      console.log("Inventory data found (no variant):", !!inventoryData);
    }

    // Get warehouse details
    const warehouse = await Warehouse.findById(fromWarehouse)
      .select("name address")
      .lean();
    console.log("Warehouse found:", !!warehouse);

    // Format response
    const responseData = {
      id: productId,
      availableQuantity: inventoryData?.AvailableQuantity || 0,
      minimumQuantity: variantData?.minimumQuantity || product.minimumQuantity || 0,
      reorderQuantity: variantData?.reorderQuantity || product.reorderQuantity || 0,
      maximumQuantity: variantData?.maximumQuantity || product.maximumQuantity || 0,
      warehouse: warehouse || {
        id: fromWarehouse,
        name: "Unknown Warehouse",
        address: {
          street: "Unknown",
          city: "Unknown", 
          state: "Unknown",
          pinCode: "000000"
        }
      },
      variant: variantData ? {
        id: variantData._id,
        SKU: variantData.SKU,
        barcode: variantData.barcode,
        images: variantData.images,
        variantAttributes: variantData.variantAttributes,
        productId: {
          productName: product.productName,
          productStatus: product.productStatus,
          productDescription: product.productDescription,
          shortDescription: product.shortDescription,
          visibility: product.visibility,
          sellingPrice: variantData.sellingPrice,
          mrpPrice: variantData.mrpPrice
        }
      } : null,
      product: [{
        productName: product.productName,
        productStatus: product.productStatus,
        productImages: product.productImages,
        SKU: product.SKU,
        productDescription: product.productDescription,
        shortDescription: product.shortDescription,
        visibility: product.visibility,
        sellingPrice: product.sellingPrice,
        mrpPrice: product.mrpPrice,
        barcode: product.barcode
      }]
    };

    console.log("Sending response data");
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error("Error fetching product with inventory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};