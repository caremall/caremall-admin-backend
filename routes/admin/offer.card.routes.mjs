import express from "express";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";
import { createOfferCard, deleteOfferCard, getAllOfferCards, getOfferCardById, updateOfferCard } from "../../models/offer.card.controller.mjs";

const router = express.Router();

router.get("/", getAllOfferCards);
router.get("/:id", getOfferCardById);
router.post("/", catchAsyncErrors(createOfferCard));
router.put("/:id", updateOfferCard);
router.delete("/:id", deleteOfferCard);

export default router;
