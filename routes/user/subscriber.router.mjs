import express from "express";
import {
    subscribe,
    confirmSubscription
} from "../../controllers/user/subscriber.controller.mjs";

const router = express.Router();


router.post("/", subscribe);


router.get("/confirm/:token", confirmSubscription);

export default router;
