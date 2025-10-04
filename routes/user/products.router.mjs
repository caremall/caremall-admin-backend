import { Router } from "express";
import { getBestSellingProducts, getFilteredProducts, getMostWantedProducts, getNearbyProducts, getNewArrivalProducts, getProductById, getProductsByCategory,
     getProductSearchSuggestions, getSearchSuggestions , getFirstOrderAmount} from "../../controllers/user/products.controller.mjs";

const router = Router()


router.get('/filter', getFilteredProducts)
router.get('/most-wanted', getMostWantedProducts)
router.get('/new-arrivals', getNewArrivalProducts)
router.get('/best-sellers', getBestSellingProducts)
router.get('/search-product', getProductSearchSuggestions)
router.get('/search', getSearchSuggestions)
router.get('/:slug', getProductById)
router.get("/by-category", getProductsByCategory);
router.get("/nearby", getNearbyProducts)
router.get("/first-order-amount", getFirstOrderAmount)



export default router