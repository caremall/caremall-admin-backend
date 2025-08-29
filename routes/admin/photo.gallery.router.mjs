import express from "express";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";
import { createPhotoGallery, deletePhotoGallery, getAllPhotoGalleries, getPhotoGalleryById, updatePhotoGallery } from "../../controllers/admin/photo.gallery.controller.mjs";

const router = express.Router();

router.get("/", getAllPhotoGalleries);
router.get("/:id", getPhotoGalleryById);
router.post("/", catchAsyncErrors(createPhotoGallery));
router.put("/:id", updatePhotoGallery);
router.delete("/:id", deletePhotoGallery);

export default router;
