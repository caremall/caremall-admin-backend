import Review from "../../models/Review.mjs";
import Product from "../../models/Product.mjs";
import User from "../../models/User.mjs";

export const getAllReviewsAdmin = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;

    if (search) {
      const users = await User.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");
      const products = await Product.find({
        productName: { $regex: search, $options: "i" },
      }).select("_id");

      filter.$or = [
        { userId: { $in: users.map((u) => u._id) } },
        { productId: { $in: products.map((p) => p._id) } },
      ];
    }

    const total = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .populate("userId", "name email")
      .populate("productId", "productName")
      .sort({ createdAt: -1 })

    res.status(200).json({
      data: reviews,
      met: {
        total,
      },
    });
  } catch (error) {
    console.error("Admin Get All Reviews Error:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};

export const getReviewByIdAdmin = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("userId", "name email")
      .populate("productId", "productName");

    if (!review) return res.status(404).json({ message: "Review not found" });

    res.status(200).json(review);
  } catch (error) {
    console.error("Admin Get Review Error:", error);
    res.status(500).json({ message: "Failed to fetch review" });
  }
};

export const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["approved", "pending", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.status = status;
    await review.save();

    res
      .status(200)
      .json({ message: "Review status updated", success: true, review });
  } catch (error) {
    console.error("Admin Update Review Status Error:", error);
    res.status(500).json({ message: "Failed to update review status" });
  }
};

export const deleteReviewAdmin = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    await Review.findByIdAndDelete(review._id);
    res.status(200).json({ message: "Review deleted", success: true });
  } catch (error) {
    console.error("Admin Delete Review Error:", error);
    res.status(500).json({ message: "Failed to delete review" });
  }
};

export const getReviewsByProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const { status } = req.query;
    const filter = { productId };

    if (status) {
      filter.status = status;
    }

    const reviews = await Review.find(filter)
      .populate("userId", "name email")
      .populate("productId", "productName")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      data: reviews,
      total: reviews.length,
    });
  } catch (error) {
    console.error("Get Reviews by Product Error:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};
