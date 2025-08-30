import Review from "../../models/Review.mjs";
import { uploadBase64Images } from "../../utils/uploadImage.mjs";

export const createReview = async (req, res) => {
  try {
    const { productId, rating, comment, images } = req.body;
    const { _id: userId } = req.user;

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product." });
    }

    // Upload base64 images to S3 and get URLs
    let uploadedImageUrls = [];
    if (images) {
      uploadedImageUrls = await uploadBase64Images(images, "review-images/");
    }

    // Create review with uploaded image URLs
    const review = await Review.create({
      productId,
      userId,
      rating,
      comment,
      images: uploadedImageUrls,
    });

    res
      .status(201)
      .json({ message: "Review submitted", success: true, review });
  } catch (error) {
    console.error("Create Review Error:", error);
    res
      .status(500)
      .json({ message: "Failed to create review", error: error.message });
  }
};



export const getAllReviews = async (req, res) => {
    try {
        const { productId, userId } = req.query;

        const filter = {};
        if (productId) filter.product = productId;
        if (userId) filter.user = userId;

        const reviews = await Review.find(filter)
            .populate('userId', 'name email')
            .populate('productId', 'productName')
            .sort({ createdAt: -1 });

        res.status(200).json(reviews);
    } catch (error) {
        console.error('Fetch Reviews Error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
};


export const getReviewById = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('productId', 'productName');

        if (!review) return res.status(404).json({ message: 'Review not found' });

        res.status(200).json(review);
    } catch (error) {
        console.error('Get Review Error:', error);
        res.status(500).json({ message: 'Failed to fetch review' });
    }
};


export const updateReview = async (req, res) => {
  try {
    const { rating, comment, images } = req.body;
    const { _id: userId } = req.user;

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this review" });
    }

    let updatedImages = review.images || [];

    if (images && Array.isArray(images)) {
      // Separate new base64 images from existing URLs
      const imagesToUpload = images.filter((img) =>
        img.startsWith("data:image/")
      );
      const existingUrls = images.filter(
        (img) => !img.startsWith("data:image/")
      );

      // Upload new base64 images
      let uploadedUrls = [];
      if (imagesToUpload.length > 0) {
        uploadedUrls = await uploadBase64Images(
          imagesToUpload,
          "review-images/"
        );
      }

      // Combine existing URLs and newly uploaded URLs
      updatedImages = [...existingUrls, ...uploadedUrls];
    } else if (typeof images === "string") {
      // Single image string - check if base64 or url
      if (images.startsWith("data:image/")) {
        updatedImages = await uploadBase64Images(images, "review-images/");
      } else {
        updatedImages = [images];
      }
    }

    review.rating = rating ?? review.rating;
    review.comment = comment ?? review.comment;
    review.images = updatedImages;

    await review.save();

    res.status(200).json({ message: "Review updated", success: true, review });
  } catch (error) {
    console.error("Update Review Error:", error);
    res
      .status(500)
      .json({ message: "Failed to update review", error: error.message });
  }
};



export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        const { _id } = req.user
        if (!review) return res.status(404).json({ message: 'Review not found' });

        if (review.userId.toString() !== _id.toString()) {
            return res.status(403).json({ message: 'Unauthorized to delete this review' });
        }

        await Review.findByIdAndDelete(review._id)
        res.status(200).json({ message: 'Review deleted', success: true });
    } catch (error) {
        console.error('Delete Review Error:', error);
        res.status(500).json({ message: 'Failed to delete review' });
    }
};

export const getReviewsByProductId = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const reviews = await Review.find({ productId })
      .populate("userId", "name email")
      .populate("productId", "productName")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Get Reviews by Product ID Error:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};
// Like Review
export const likeReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const userId = req.user._id.toString();

    const liked = review.likes.some((id) => id.toString() === userId);
    const disliked = review.dislikes.some((id) => id.toString() === userId);

    if (liked) {
      // User clicked like again → toggle off like
      review.likes = review.likes.filter((id) => id.toString() !== userId);
    } else {
      // Add like
      review.likes.push(userId);
      // Remove dislike if present
      if (disliked) {
        review.dislikes = review.dislikes.filter(
          (id) => id.toString() !== userId
        );
      }
    }

    await review.save();

    res.status(200).json({
      message: liked ? "Like removed" : "Review liked",
      likesCount: review.likes.length,
      dislikesCount: review.dislikes.length,
    });
  } catch (error) {
    console.error("Like Review Error:", error);
    res.status(500).json({ message: "Failed to like review" });
  }
};

export const dislikeReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const userId = req.user._id.toString();

    const disliked = review.dislikes.some((id) => id.toString() === userId);
    const liked = review.likes.some((id) => id.toString() === userId);

    if (disliked) {
      // User clicked dislike again → toggle off dislike
      review.dislikes = review.dislikes.filter(
        (id) => id.toString() !== userId
      );
    } else {
      // Add dislike
      review.dislikes.push(userId);
      // Remove like if present
      if (liked) {
        review.likes = review.likes.filter((id) => id.toString() !== userId);
      }
    }

    await review.save();

    res.status(200).json({
      message: disliked ? "Dislike removed" : "Review disliked",
      dislikesCount: review.dislikes.length,
      likesCount: review.likes.length,
    });
  } catch (error) {
    console.error("Dislike Review Error:", error);
    res.status(500).json({ message: "Failed to dislike review" });
  }
};
