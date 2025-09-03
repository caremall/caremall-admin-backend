import { Router } from "express";
import { createReview, deleteReview, dislikeReview, getAllReviews, getMyReviewForProduct, getReviewById, getReviewsByProductId, likeReview, updateReview } from "../../controllers/user/reviews.controller.mjs";
import { verifyUserToken } from "../../middlewares/verifyToken.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = Router()

router.post('/', verifyUserToken, catchAsyncErrors(createReview))
router.get('/', getAllReviews)
router.get('/:id', getReviewById)
router.get('/product/:id', getReviewsByProductId)
router.get('/my-review/:id',verifyUserToken, getMyReviewForProduct)
router.put('/:id', verifyUserToken, updateReview)
router.delete('/:id', verifyUserToken, deleteReview)
router.post("/like/:id",verifyUserToken,likeReview)
router.post("/dislike/:id",verifyUserToken,dislikeReview)

export default router