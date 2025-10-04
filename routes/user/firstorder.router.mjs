import { Router } from "express";
import { getFirstOrderAmount } from "../../controllers/user/firstorder.controller.mjs";

const firstOrderRouter = Router();

firstOrderRouter.get("/", getFirstOrderAmount);

export default firstOrderRouter