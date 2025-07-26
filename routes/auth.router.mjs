import { Router } from "express";
import { login, logout, refresh } from "../controllers/auth/auth.controller.mjs";


const router = Router()


router.post('/login', login)
router.get('/refresh', refresh)
router.get('/logout', logout)


export default router