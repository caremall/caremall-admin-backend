import mongoose from "mongoose";
import Cart from "../../models/Cart.mjs";
import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";
import Offer from "../../models/offerManagement.mjs";

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

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let price = product.landingSellPrice && product.landingSellPrice > 0
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

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [
          {
            product: productId,
            variant: variantId,
            quantity,
            priceAtCart: price,
            totalPrice: itemTotal,
          },
        ],
        cartTotal: itemTotal,
      });
    } else {
      const index = cart.items.findIndex(
        (item) =>
          item.product.toString() === productId &&
          ((item.variant && item.variant.toString()) || "") ===
          (variantId || "")
      );

      if (index >= 0) {
        cart.items[index].quantity += quantity;
        cart.items[index].totalPrice =
          cart.items[index].quantity * cart.items[index].priceAtCart;
      } else {
        cart.items.push({
          product: productId,
          variant: variantId,
          quantity,
          priceAtCart: price,
          totalPrice: itemTotal,
        });
      }
      cart.cartTotal = calculateCartTotal(cart.items);
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
      let price = product.landingSellPrice && product.landingSellPrice > 0
        ? product.landingSellPrice
        : product.sellingPrice;
      if (parsedVariantId) {
        const variant = await Variant.findById(parsedVariantId);
        if (!variant) {
          return res
            .status(404)
            .json({ message: `Variant not found: ${parsedVariantId}` });
        }
        price = (variant.landingSellPrice && variant.landingSellPrice > 0
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

export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId })
      .populate(
        "items.product",
        "productName productImages sellingPrice urlSlug mrpPrice sellingPrice hasVariant category brand"
      )
      .populate("items.variant");

    if (!cart) return res.status(200).json({ items: [], cartTotal: 0 });

    // Fetch active published offers valid now
    const now = new Date();
    const offers = await Offer.find({
      offerStatus: "published",
      offerRedeemTimePeriod: { $exists: true, $not: { $size: 0 } },
      "offerRedeemTimePeriod.0": { $lte: now },
      "offerRedeemTimePeriod.1": { $gte: now },
    });

    const applyDiscount = (price, discountUnit, discountValue) => {
      if (discountUnit === "percentage") {
        return price - (price * discountValue) / 100;
      } else if (discountUnit === "fixed") {
        return price - discountValue;
      }
      return price;
    };

    let cartTotal = 0;
    const discountedItems = cart.items.map((item) => {
      let discountedPrice = item.product.sellingPrice;

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
            // Check category eligibility (category is ObjectId)
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
            // Check brand eligibility (brand is ObjectId)
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
      const lineTotal = discountedPrice * item.quantity;
      cartTotal += lineTotal;

      return {
        ...item.toObject(),
        discountedPrice,
        lineTotal,
      };
    });

    // Apply cart-level offers on the total after item discounts
    let finalCartTotal = cartTotal;
    for (const offer of offers) {
      if (offer.offerType === "cart") {
        if (cartTotal >= offer.offerMinimumOrderValue) {
          finalCartTotal = applyDiscount(
            finalCartTotal,
            offer.offerDiscountUnit,
            offer.offerDiscountValue
          );
          finalCartTotal = Math.max(0, finalCartTotal);
        }
      }
    }

    res.status(200).json({
      items: discountedItems,
      cartTotal: finalCartTotal,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Failed to fetch cart" });
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

    // 🔹 Direct quantity update if given
    if (typeof quantity === "number") {
      if (quantity < 1) {
        // Remove item if quantity is zero or negative
        cart.items.splice(index, 1);
      } else {
        item.quantity = quantity;
        item.totalPrice = item.quantity * item.priceAtCart;
      }
    }
    // 🔹 Otherwise fall back to action type
    else if (action === "increment") {
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

    // 🔹 Recalculate cart total
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
