import express from "express";
import { getAllOfferCards, getOfferCardById } from "../../models/offer.card.controller.mjs";


const router = express.Router();

router.get("/", getAllOfferCards);
router.get("/:id", getOfferCardById);

export default router;
