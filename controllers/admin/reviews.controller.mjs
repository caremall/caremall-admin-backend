import Review from "../../models/Review.mjs";
import Product from "../../models/Product.mjs";
import User from "../../models/User.mjs";
import mongoose from "mongoose";


export const getAllReviewsAdmin = async (req, res) => {
  try {
    const { search, status, categoryId, brandId } = req.query;
    const matchQuery = {};

    if (search) matchQuery.productName = { $regex: search, $options: "i" };
    if (status) matchQuery.productStatus = status;
    if (categoryId) matchQuery.category = mongoose.Types.ObjectId(categoryId);
    if (brandId) matchQuery.brand = mongoose.Types.ObjectId(brandId);

    const products = await Product.aggregate([
      {
        $match: matchQuery,
      },
      {
        $lookup: {
          from: "reviews",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
                status: "approved",
              },
            },
            {
              $project: {
                userId: 1,
                rating: 1,
                comment: 1,
                status: 1,
                createdAt: 1,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                rating: 1,
                comment: 1,
                status: 1,
                createdAt: 1,
                user: { name: 1 },
              },
            },
          ],
          as: "reviews",
        },
      },
      {
        $addFields: {
          averageRating: { $avg: "$reviews.rating" },
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $unwind: { path: "$brand", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: { path: "$category", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          productName: 1,
          urlSlug: 1,
          brand: { brandName: 1 },
          category: { name: 1 },
          reviews: 1,
          averageRating: { $ifNull: ["$averageRating", 0] },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json(products);
  } catch (error) {
    console.error(
      "Error fetching products with reviews and average rating:",
      error
    );
    res.status(500).json({ message: "Server error" });
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
    const productId = req.params.id;
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
