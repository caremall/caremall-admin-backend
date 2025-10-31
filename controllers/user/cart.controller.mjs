import mongoose from "mongoose";
import Cart from "../../models/Cart.mjs";
import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";
import Offer from "../../models/offerManagement.mjs";

// const calculateCartTotal = (items) => {
//   return items.reduce((acc, item) => acc + item.totalPrice, 0);
// };

const calculateCartTotal = (items) => {
  return items.reduce((acc, item) => acc + item.totalPrice, 0);
};

export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, variantId = null, quantity } = req.body;

    if (!productId || !quantity) {
      return res
        .status(400)
        .json({ message: "Product and quantity are required." });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const parsedVariantId = variantId && variantId !== "" ? variantId : null;

    if (parsedVariantId && !mongoose.Types.ObjectId.isValid(parsedVariantId)) {
      return res.status(400).json({ message: "Invalid variant ID" });
    }

    // Fetch product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Check maximum quantity
    let maxQuantity;
    if (parsedVariantId) {
      const variant = await Variant.findOne({
        _id: parsedVariantId,
        productId: productId,
      }).populate("inventory");

      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }
      maxQuantity = variant.maximumQuantity;
    } else {
      maxQuantity = product.maximumQuantity;
    }

    if (maxQuantity > 0 && quantity > maxQuantity) {
      return res.status(400).json({
        message: `Cannot add more than maximum quantity of ${maxQuantity}`,
      });
    }

    // Determine price
    let price =
      product.landingSellPrice && product.landingSellPrice > 0
        ? product.landingSellPrice
        : product.sellingPrice;

    if (parsedVariantId) {
      const variant = await Variant.findById(parsedVariantId);
      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }

      price =
        (variant.landingSellPrice && variant.landingSellPrice > 0
          ? variant.landingSellPrice
          : variant.sellingPrice) || price;
    }

    const itemTotal = price * quantity;

    // Fetch existing cart
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // create new cart if doesn't exist
      cart = new Cart({
        user: userId,
        items: [
          {
            product: productId,
            variant: parsedVariantId, // will store null if no variant
            quantity,
            priceAtCart: price,
            totalPrice: itemTotal,
          },
        ],
        cartTotal: itemTotal,
      });

      await cart.save(); // <-- you forgot this
    } else {
      // check if product/variant already exists
      const index = cart.items.findIndex(
        (item) =>
          item.product.toString() === productId &&
          String(item.variant || null) === String(parsedVariantId || null)
      );

      if (index >= 0) {
        // if item exists, validate maxQuantity
        const newQuantity = cart.items[index].quantity + quantity;
        if (maxQuantity > 0 && newQuantity > maxQuantity) {
          return res.status(400).json({
            message: `Cannot exceed maximum quantity of ${maxQuantity}. Current quantity: ${cart.items[index].quantity}`,
          });
        }

        cart.items[index].quantity += quantity;
        cart.items[index].totalPrice =
          cart.items[index].quantity * cart.items[index].priceAtCart;
      } else {
        cart.items.push({
          product: productId,
          variant: parsedVariantId,
          quantity,
          priceAtCart: price,
          totalPrice: itemTotal,
        });
      }

      // recalc cartTotal always
      cart.cartTotal = calculateCartTotal(cart.items);

      console.log("Cart just before save:", JSON.stringify(cart, null, 2));

      // force Mongoose to know array changed
      cart.markModified("items");
      console.log("Cart just before save:", JSON.stringify(cart, null, 2));

      await cart.save();
    }

    res.status(200).json({ message: "Item added to cart", cart });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: "Failed to add item to cart" });
  }
};

export const bulkAddToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required" });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [], cartTotal: 0 });
    }

    for (const item of items) {
      const { productId, variantId = null, quantity } = item;

      // Validation
      if (!productId || !quantity) {
        return res.status(400).json({
          message: "Product ID and quantity are required for all items",
        });
      }
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res
          .status(400)
          .json({ message: `Invalid product ID: ${productId}` });
      }
      const parsedVariantId = variantId && variantId !== "" ? variantId : null;
      if (
        parsedVariantId &&
        !mongoose.Types.ObjectId.isValid(parsedVariantId)
      ) {
        return res
          .status(400)
          .json({ message: `Invalid variant ID: ${parsedVariantId}` });
      }

      // Find product
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${productId}` });
      }

      // Set price (variant overrides product price if exists)
      let price =
        product.landingSellPrice && product.landingSellPrice > 0
          ? product.landingSellPrice
          : product.sellingPrice;
      if (parsedVariantId) {
        const variant = await Variant.findById(parsedVariantId);
        if (!variant) {
          return res
            .status(404)
            .json({ message: `Variant not found: ${parsedVariantId}` });
        }
        price =
          (variant.landingSellPrice && variant.landingSellPrice > 0
            ? variant.landingSellPrice
            : variant.sellingPrice) || price;
      }

      const itemTotal = price * quantity;

      // Check if item already exists in cart
      const index = cart.items.findIndex(
        (i) =>
          i.product.toString() === productId &&
          ((i.variant && i.variant.toString()) || "") ===
            (parsedVariantId || "")
      );

      if (index >= 0) {
        cart.items[index].quantity += quantity;
        cart.items[index].totalPrice =
          cart.items[index].quantity * cart.items[index].priceAtCart;
      } else {
        cart.items.push({
          product: productId,
          variant: parsedVariantId,
          quantity,
          priceAtCart: price,
          totalPrice: itemTotal,
        });
      }
    }

    // Update cart total
    cart.cartTotal = calculateCartTotal(cart.items);
    await cart.save();

    res.status(200).json({ message: "Items added to cart", cart });
  } catch (error) {
    console.error("Bulk add to cart error:", error);
    res.status(500).json({ message: "Failed to add bulk items to cart" });
  }
};

// export const getCart = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     console.log(userId, "==========================");

//     const cart = await Cart.findOne({ user: userId })
//       .populate({
//         path: "items.product",
//         select:
//           "productName productImages sellingPrice urlSlug mrpPrice landingSellPrice hasVariant category brand discountPercent minimumQuantity reorderQuantity maximumQuantity productStatus visibility",
//         model: "Product",
//       })
//       .populate({
//         path: "items.variant",
//         select:
//           "variantAttributes SKU barcode costPrice sellingPrice mrpPrice landingSellPrice discountPercent minimumQuantity reorderQuantity maximumQuantity taxRate images isDefault",
//         model: "Variant",
//       })
//       .populate({
//         path: "items.product.brand",
//         select: "brandName",
//         model: "Brand",
//       })
//       .populate({
//         path: "items.product.category",
//         select: "categoryName",
//         model: "Category",
//       })
//       .lean();

//     if (!cart || !cart.items || cart.items.length === 0) {
//       return res.status(200).json({ items: [], cartTotal: 0 });
//     }

//     // Filter out items where product no longer exists or is not published/visible
//     const validItems = cart.items.filter((item) => {
//       if (!item.product) {
//         console.warn("Product missing for cart item, will be cleaned up");
//         return false;
//       }

//       // Check if product is published and visible
//       if (
//         item.product.productStatus !== "published" ||
//         item.product.visibility !== "visible"
//       ) {
//         console.warn("Product is not available, will be removed from cart");
//         return false;
//       }

//       return true;
//     });

//     // Clean invalid items from cart
//     // if (validItems.length !== cart.items.length) {
//     //   await Cart.updateOne(
//     //     { user: userId },
//     //     {
//     //       $set: {
//     //         items: validItems,
//     //         updatedAt: new Date(),
//     //       },
//     //     }
//     //   );
//     // }

//     const now = new Date();
//     const offers = await Offer.find({
//       offerStatus: "published",
//       offerRedeemTimePeriod: { $exists: true, $not: { $size: 0 } },
//       "offerRedeemTimePeriod.0": { $lte: now },
//       "offerRedeemTimePeriod.1": { $gte: now },
//     });

//     const applyDiscount = (price, discountUnit, discountValue) => {
//       if (discountUnit === "percentage") {
//         return Math.max(0, price - (price * discountValue) / 100);
//       } else if (discountUnit === "fixed") {
//         return Math.max(0, price - discountValue);
//       }
//       return price;
//     };

//     let cartSubtotal = 0;
//     const discountedItems = [];

//     for (const item of validItems) {
//       // Determine base price and validate availability
//       let basePrice = 0;
//       let availableQuantity = 0;
//       let maxAllowedQuantity = 0;
//       let variantDetails = null;
//       let productDetails = {
//         productName: item.product.productName,
//         productImages: item.product.productImages || [],
//         brand: item.product.brand,
//         category: item.product.category,
//         hasVariant: item.product.hasVariant,
//         discountPercent: item.product.discountPercent || 0,
//         urlSlug: item.product.urlSlug,
//         _id: item.product._id,
//       };

//       if (item.product.hasVariant && item.variant) {
//         // Use variant pricing and inventory
//         basePrice =
//           item.variant.landingSellPrice > 0
//             ? item.variant.landingSellPrice
//             : item.variant.sellingPrice;

//         // Get variant inventory details
//         const variantInventory = await mongoose
//           .model("Inventory")
//           .findOne({
//             variant: item.variant._id,
//           })
//           .lean();

//         availableQuantity = variantInventory?.quantity || 0;
//         maxAllowedQuantity = Math.min(
//           item.variant.maximumQuantity || 10,
//           availableQuantity
//         );

//         variantDetails = {
//           _id: item.variant._id,
//           variantAttributes: item.variant.variantAttributes || [],
//           SKU: item.variant.SKU,
//           barcode: item.variant.barcode,
//           costPrice: item.variant.costPrice,
//           sellingPrice: item.variant.sellingPrice,
//           mrpPrice: item.variant.mrpPrice,
//           landingSellPrice: item.variant.landingSellPrice,
//           discountPercent: item.variant.discountPercent || 0,
//           minimumQuantity: item.variant.minimumQuantity || 0,
//           reorderQuantity: item.variant.reorderQuantity || 0,
//           maximumQuantity: item.variant.maximumQuantity || 0,
//           taxRate: item.variant.taxRate || 0,
//           images: item.variant.images || [],
//           isDefault: item.variant.isDefault || false,
//         };

//         console.log("Using variant price:", {
//           productId: item.product._id,
//           variantId: item.variant._id,
//           landingSellPrice: item.variant.landingSellPrice,
//           sellingPrice: item.variant.sellingPrice,
//           finalPrice: basePrice,
//           availableQuantity,
//           maxAllowedQuantity,
//         });
//       } else {
//         // Use product pricing and inventory
//         basePrice =
//           item.product.landingSellPrice > 0
//             ? item.product.landingSellPrice
//             : item.product.sellingPrice;

//         // Get product inventory details
//         const productInventory = await mongoose
//           .model("Inventory")
//           .findOne({
//             product: item.product._id,
//             variant: { $exists: false },
//           })
//           .lean();

//         availableQuantity = productInventory?.quantity || 0;
//         maxAllowedQuantity = Math.min(
//           item.product.maximumQuantity || 10,
//           availableQuantity
//         );

//         console.log("Using product price:", {
//           productId: item.product._id,
//           landingSellPrice: item.product.landingSellPrice,
//           sellingPrice: item.product.sellingPrice,
//           finalPrice: basePrice,
//           availableQuantity,
//           maxAllowedQuantity,
//         });
//       }

//       // Validate basePrice
//       if (!basePrice || basePrice <= 0 || isNaN(basePrice)) {
//         console.warn("Invalid base price for item:", item);
//         basePrice = item.product.sellingPrice || 0;
//       }

//       // Adjust quantity if it exceeds available stock
//       let finalQuantity = item.quantity;
//       if (finalQuantity > maxAllowedQuantity && maxAllowedQuantity > 0) {
//         console.warn(
//           `Reducing quantity from ${finalQuantity} to ${maxAllowedQuantity} due to stock limits`
//         );
//         finalQuantity = maxAllowedQuantity;

//         // Update cart with corrected quantity
//         // await Cart.updateOne(
//         //   {
//         //     user: userId,
//         //     "items._id": item._id,
//         //   },
//         //   {
//         //     $set: {
//         //       "items.$.quantity": finalQuantity,
//         //       updatedAt: new Date(),
//         //     },
//         //   }
//         // );
//       }

//       let discountedPrice = basePrice;
//       let originalPrice = basePrice;

//       // Apply offers/discounts
//       for (const offer of offers) {
//         switch (offer.offerType) {
//           case "product":
//             if (
//               offer.offerEligibleItems.includes(item.product._id.toString())
//             ) {
//               discountedPrice = applyDiscount(
//                 discountedPrice,
//                 offer.offerDiscountUnit,
//                 offer.offerDiscountValue
//               );
//             }
//             break;
//           case "category":
//             if (
//               item.product.category &&
//               offer.offerEligibleItems.includes(
//                 item.product.category.toString()
//               )
//             ) {
//               discountedPrice = applyDiscount(
//                 discountedPrice,
//                 offer.offerDiscountUnit,
//                 offer.offerDiscountValue
//               );
//             }
//             break;
//           case "brand":
//             if (
//               item.product.brand &&
//               offer.offerEligibleItems.includes(item.product.brand.toString())
//             ) {
//               discountedPrice = applyDiscount(
//                 discountedPrice,
//                 offer.offerDiscountUnit,
//                 offer.offerDiscountValue
//               );
//             }
//             break;
//         }
//       }

//       discountedPrice = Math.max(0, discountedPrice);
//       const lineTotal = discountedPrice * finalQuantity;
//       cartSubtotal += lineTotal;

//       // Build the complete item response
//       const cartItemResponse = {
//         product: {
//           ...productDetails,
//           sellingPrice: item.product.sellingPrice,
//           mrpPrice: item.product.mrpPrice,
//           landingSellPrice: item.product.landingSellPrice,
//           discountPercent: item.product.discountPercent || 0,
//           minimumQuantity: item.product.minimumQuantity || 0,
//           reorderQuantity: item.product.reorderQuantity || 0,
//           maximumQuantity: item.product.maximumQuantity || 0,
//           hasVariant: item.product.hasVariant,
//           productImages: item.product.productImages || [],
//           _id: item.product._id,
//         },
//         variant: variantDetails,
//         quantity: finalQuantity,
//         priceAtCart: discountedPrice,
//         totalPrice: lineTotal,
//         originalPrice: originalPrice,
//         discountedPrice: discountedPrice,
//         lineTotal: lineTotal,
//         availableQuantity: availableQuantity,
//         maxAllowedQuantity: maxAllowedQuantity,
//         isAvailable: availableQuantity > 0,
//       };

//       discountedItems.push(cartItemResponse);
//     }

//     // Apply cart-level offers
//     let finalCartTotal = cartSubtotal;
//     let appliedCartOffers = [];

//     for (const offer of offers) {
//       if (offer.offerType === "cart") {
//         if (cartSubtotal >= (offer.offerMinimumOrderValue || 0)) {
//           const discountAmount =
//             offer.offerDiscountUnit === "percentage"
//               ? (finalCartTotal * offer.offerDiscountValue) / 100
//               : offer.offerDiscountValue;

//           finalCartTotal = applyDiscount(
//             finalCartTotal,
//             offer.offerDiscountUnit,
//             offer.offerDiscountValue
//           );

//           appliedCartOffers.push({
//             offerName: offer.offerName,
//             discountAmount: discountAmount,
//             discountType: offer.offerDiscountUnit,
//           });
//         }
//       }
//     }

//     finalCartTotal = Math.round(finalCartTotal * 100) / 100;

//     // Update cart total in database
//     // await Cart.updateOne(
//     //   { user: userId },
//     //   {
//     //     $set: {
//     //       cartTotal: finalCartTotal,
//     //       updatedAt: new Date(),
//     //     },
//     //   }
//     // );

//     res.status(200).json({
//       items: discountedItems,
//       cartTotal: finalCartTotal,
//       cartSubtotal: cartSubtotal,
//       appliedOffers: appliedCartOffers,
//       itemCount: discountedItems.length,
//       totalQuantity: discountedItems.reduce(
//         (sum, item) => sum + item.quantity,
//         0
//       ),
//     });
//   } catch (error) {
//     console.error("Get cart error:", error);
//     res.status(500).json({
//       message: "Failed to fetch cart",
//       error: error.message,
//     });
//   }
// };

// // import mongoose from "mongoose";
// import Cart from "../models/cart.js";
// import Offer from "../models/offer.js"; // adjust import if needed

export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.product",
        select:
          "productName productImages sellingPrice urlSlug mrpPrice landingSellPrice hasVariant category brand discountPercent minimumQuantity reorderQuantity maximumQuantity productStatus visibility",
      })
      .populate({
        path: "items.variant",
        select:
          "variantAttributes SKU barcode costPrice sellingPrice mrpPrice landingSellPrice discountPercent minimumQuantity reorderQuantity maximumQuantity taxRate images isDefault",
      })
      .populate({
        path: "items.product.brand",
        select: "brandName",
      })
      .populate({
        path: "items.product.category",
        select: "categoryName",
      })
      .lean();

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(200).json({ items: [], cartTotal: 0 });
    }

    // Filter items in memory (not DB)
    const validItems = cart.items.filter((item) => {
      if (!item.product) return false;
      if (
        item.product.productStatus !== "published" ||
        item.product.visibility !== "visible"
      ) {
        return false;
      }
      return true;
    });

    const now = new Date();
    const offers = await Offer.find({
      offerStatus: "published",
      offerRedeemTimePeriod: { $exists: true, $not: { $size: 0 } },
      "offerRedeemTimePeriod.0": { $lte: now },
      "offerRedeemTimePeriod.1": { $gte: now },
    }).lean();

    const applyDiscount = (price, discountUnit, discountValue) => {
      if (discountUnit === "percentage") {
        return Math.max(0, price - (price * discountValue) / 100);
      } else if (discountUnit === "fixed") {
        return Math.max(0, price - discountValue);
      }
      return price;
    };

    let cartSubtotal = 0;
    const discountedItems = [];

    for (const item of validItems) {
      let basePrice = 0;
      let availableQuantity = 0;
      let maxAllowedQuantity = 0;
      let variantDetails = null;

      // Product details for response
      let productDetails = {
        productName: item.product.productName,
        productImages: item.product.productImages || [],
        brand: item.product.brand,
        category: item.product.category,
        hasVariant: item.product.hasVariant,
        discountPercent: item.product.discountPercent || 0,
        urlSlug: item.product.urlSlug,
        _id: item.product._id,
      };

      if (item.product.hasVariant && item.variant) {
        basePrice =
          item.variant.landingSellPrice > 0
            ? item.variant.landingSellPrice
            : item.variant.sellingPrice;

        const variantInventory = await mongoose
          .model("Inventory")
          .findOne({ variant: item.variant._id })
          .lean();

        availableQuantity = variantInventory?.quantity || 0;
        maxAllowedQuantity = Math.min(
          item.variant.maximumQuantity || 10,
          availableQuantity
        );

        variantDetails = {
          _id: item.variant._id,
          variantAttributes: item.variant.variantAttributes || [],
          SKU: item.variant.SKU,
          barcode: item.variant.barcode,
          costPrice: item.variant.costPrice,
          sellingPrice: item.variant.sellingPrice,
          mrpPrice: item.variant.mrpPrice,
          landingSellPrice: item.variant.landingSellPrice,
          discountPercent: item.variant.discountPercent || 0,
          minimumQuantity: item.variant.minimumQuantity || 0,
          reorderQuantity: item.variant.reorderQuantity || 0,
          maximumQuantity: item.variant.maximumQuantity || 0,
          taxRate: item.variant.taxRate || 0,
          images: item.variant.images || [],
          isDefault: item.variant.isDefault || false,
        };
      } else {
        basePrice =
          item.product.landingSellPrice > 0
            ? item.product.landingSellPrice
            : item.product.sellingPrice;

        const productInventory = await mongoose
          .model("Inventory")
          .findOne({ product: item.product._id, variant: { $exists: false } })
          .lean();

        availableQuantity = productInventory?.quantity || 0;
        maxAllowedQuantity = Math.min(
          item.product.maximumQuantity || 10,
          availableQuantity
        );
      }

      if (!basePrice || basePrice <= 0 || isNaN(basePrice)) {
        basePrice = item.product.sellingPrice || 0;
      }

      // Adjust quantity only in response (not DB)
      let finalQuantity = item.quantity;
      if (finalQuantity > maxAllowedQuantity && maxAllowedQuantity > 0) {
        finalQuantity = maxAllowedQuantity;
      }

      // Apply product/category/brand discounts
      let discountedPrice = basePrice;
      for (const offer of offers) {
        switch (offer.offerType) {
          case "product":
            if (
              offer.offerEligibleItems.includes(item.product._id.toString())
            ) {
              discountedPrice = applyDiscount(
                discountedPrice,
                offer.offerDiscountUnit,
                offer.offerDiscountValue
              );
            }
            break;
          case "category":
            if (
              item.product.category &&
              offer.offerEligibleItems.includes(
                item.product.category.toString()
              )
            ) {
              discountedPrice = applyDiscount(
                discountedPrice,
                offer.offerDiscountUnit,
                offer.offerDiscountValue
              );
            }
            break;
          case "brand":
            if (
              item.product.brand &&
              offer.offerEligibleItems.includes(item.product.brand.toString())
            ) {
              discountedPrice = applyDiscount(
                discountedPrice,
                offer.offerDiscountUnit,
                offer.offerDiscountValue
              );
            }
            break;
        }
      }

      discountedPrice = Math.max(0, discountedPrice);
      const lineTotal = discountedPrice * finalQuantity;
      cartSubtotal += lineTotal;

      discountedItems.push({
        product: {
          ...productDetails,
          sellingPrice: item.product.sellingPrice,
          mrpPrice: item.product.mrpPrice,
          landingSellPrice: item.product.landingSellPrice,
        },
        variant: variantDetails,
        quantity: finalQuantity,
        priceAtCart: discountedPrice,
        totalPrice: lineTotal,
        originalPrice: basePrice,
        discountedPrice,
        lineTotal,
        availableQuantity,
        maxAllowedQuantity,
        isAvailable: availableQuantity > 0,
      });
    }

    // Cart-level offers
    let finalCartTotal = cartSubtotal;
    let appliedCartOffers = [];

    for (const offer of offers) {
      if (offer.offerType === "cart") {
        if (cartSubtotal >= (offer.offerMinimumOrderValue || 0)) {
          const discountAmount =
            offer.offerDiscountUnit === "percentage"
              ? (finalCartTotal * offer.offerDiscountValue) / 100
              : offer.offerDiscountValue;

          finalCartTotal = applyDiscount(
            finalCartTotal,
            offer.offerDiscountUnit,
            offer.offerDiscountValue
          );

          appliedCartOffers.push({
            offerName: offer.offerName,
            discountAmount,
            discountType: offer.offerDiscountUnit,
          });
        }
      }
    }

    finalCartTotal = Math.round(finalCartTotal * 100) / 100;

    // Response (read-only, no DB updates)
    res.status(200).json({
      items: discountedItems,
      cartTotal: finalCartTotal,
      cartSubtotal,
      appliedOffers: appliedCartOffers,
      itemCount: discountedItems.length,
      totalQuantity: discountedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch cart", error: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, variantId = null, action, quantity } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const index = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        ((item.variant && item.variant.toString()) || "") === (variantId || "")
    );

    if (index === -1)
      return res.status(404).json({ message: "Item not found in cart" });

    let item = cart.items[index];

    //  Fetch product/variant to get maximum quantity
    let maxQuantity;
    if (variantId) {
      // For variant product - get variant's maximum quantity
      const variant = await mongoose
        .model("Variant")
        .findOne({
          _id: variantId,
          productId: productId,
        })
        .populate("inventory");

      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }
      maxQuantity = variant.maximumQuantity;
    } else {
      // For non-variant product - get product's maximum quantity
      const product = await mongoose
        .model("Product")
        .findOne({
          _id: productId,
        })
        .populate("inventory");

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      maxQuantity = product.maximumQuantity;
    }

    //  Direct quantity update if given
    if (typeof quantity === "number") {
      if (maxQuantity == 0) {
        item.quantity = quantity;
        item.totalPrice = item.quantity * item.priceAtCart;
        // cart.items.splice(index, 1);
      } else if (quantity > maxQuantity) {
        return res.status(400).json({
          message: `Maximum quantity allowed is ${maxQuantity}`,
        });
      } else {
        item.quantity = quantity;
        item.totalPrice = item.quantity * item.priceAtCart;
      }
    }
    //  Otherwise fall back to action type
    else if (action === "increment") {
      if (item.quantity >= maxQuantity) {
        return res.status(400).json({
          message: `Cannot exceed maximum quantity of ${maxQuantity}`,
        });
      }
      item.quantity += 1;
      item.totalPrice = item.quantity * item.priceAtCart;
    } else if (action === "decrement") {
      item.quantity -= 1;
      if (item.quantity < 1) {
        cart.items.splice(index, 1);
      } else {
        item.totalPrice = item.quantity * item.priceAtCart;
      }
    } else {
      return res.status(400).json({ message: "Invalid action or quantity" });
    }

    //  Recalculate cart total
    cart.cartTotal = cart.items.reduce((acc, curr) => acc + curr.totalPrice, 0);

    await cart.save();

    res.status(200).json({ message: "Cart updated", cart });
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({ message: "Failed to update cart item" });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, variantId = null } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) =>
        !(
          item.product.toString() === productId &&
          ((item.variant && item.variant.toString()) || "") ===
            (variantId || "")
        )
    );

    cart.cartTotal = calculateCartTotal(cart.items);
    cart.updatedAt = new Date();
    await cart.save();

    res.status(200).json({ message: "Item removed from cart", cart });
  } catch (error) {
    console.error("Remove cart item error:", error);
    res.status(500).json({ message: "Failed to remove item from cart" });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    await Cart.findOneAndUpdate(
      { user: userId },
      { items: [], cartTotal: 0, updatedAt: new Date() }
    );

    res.status(200).json({ message: "Cart cleared" });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ message: "Failed to clear cart" });
  }
};
