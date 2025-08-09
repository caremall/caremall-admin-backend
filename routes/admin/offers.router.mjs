import express from "express";
import {
  createOffer,
  getAllOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  updateOfferStatus,
} from "../../controllers/admin/offers.controller.mjs";

const router = express.Router();

router.get("/", getAllOffers);
router.get("/:id", getOfferById);
router.post("/", createOffer);
router.put("/:id", updateOffer);
router.delete("/:id", deleteOffer);
router.patch("/:id/status", updateOfferStatus);

export default router;
