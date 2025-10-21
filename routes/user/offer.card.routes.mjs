import express from "express";
import { getAllActiveOfferCards, getOfferCardById  } from "../../models/offer.card.controller.mjs";


const router = express.Router();

router.get("/", getAllActiveOfferCards);
router.get("/:id", getOfferCardById);

export default router;
