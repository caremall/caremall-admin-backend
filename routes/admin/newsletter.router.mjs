import express from "express";
import { getAllSubscribers } from "../../controllers/admin/newsletter.controller.mjs";

const router = express.Router();

router.get("/", getAllSubscribers);

export default router;
