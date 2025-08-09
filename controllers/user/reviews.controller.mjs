import Review from "../../models/Review.mjs";

export const createReview = async (req, res) => {
    try {
        const { productId, rating, comment, images } = req.body;
        const { _id } = req.user
        const existingReview = await Review.findOne({ productId, userId: _id });
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this product.' });
        }

        const review = await Review.create({
            productId,
            userId: _id,
            rating,
            comment,
            images,
        });

        res.status(201).json({ message: 'Review submitted', success: true, review });
    } catch (error) {
        console.error('Create Review Error:', error);
        res.status(500).json({ message: 'Failed to create review' });
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
        const { _id } = req.user
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });

        if (review.userId.toString() !== _id.toString()) {
            return res.status(403).json({ message: 'Unauthorized to update this review' });
        }

        review.rating = rating ?? review.rating;
        review.comment = comment ?? review.comment;
        review.images = images ?? review.images;

        await review.save();
        res.status(200).json({ message: 'Review updated', success: true, review });
    } catch (error) {
        console.error('Update Review Error:', error);
        res.status(500).json({ message: 'Failed to update review' });
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