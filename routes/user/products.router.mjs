import { Router } from "express";
import { getBestSellingProducts, getFilteredProducts, getMostWantedProducts, getNearbyProducts, getNewArrivalProducts, getProductById, getProductsByCategory, getSearchSuggestions } from "../../controllers/user/products.controller.mjs";

const router = Router()


router.get('/filter', getFilteredProducts)
router.get('/most-wanted', getMostWantedProducts)
router.get('/new-arrivals', getNewArrivalProducts)
router.get('/best-sellers', getBestSellingProducts)
router.get('/search-product', getSearchSuggestions)
router.get('/:slug', getProductById)
router.get("/by-category", getProductsByCategory);
router.get("/nearby", getNearbyProducts)


export default router