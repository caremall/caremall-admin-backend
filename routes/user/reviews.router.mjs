import { Router } from "express";
import { createReview, deleteReview, getAllReviews, getReviewById, getReviewsByProductId, updateReview } from "../../controllers/user/reviews.controller.mjs";
import { verifyUserToken } from "../../middlewares/verifyToken.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = Router()

router.post('/', verifyUserToken, catchAsyncErrors(createReview))
router.get('/', getAllReviews)
router.get('/:id', getReviewById)
router.get('/product/:id', getReviewsByProductId)
router.put('/:id', verifyUserToken, updateReview)
router.delete('/:id', verifyUserToken, deleteReview)



export default router