import { Router } from "express";
import { createReview, deleteReview, getAllReviews, getReviewById, updateReview } from "../../controllers/user/reviews.controller.mjs";
import { verifyUserToken } from "../../middlewares/verifyToken.mjs";

const router = Router()

router.post('/', verifyUserToken, createReview)
router.get('/', getAllReviews)
router.get('/:id', getReviewById)
router.put('/:id', verifyUserToken, updateReview)
router.delete('/:id', verifyUserToken, deleteReview)



export default router