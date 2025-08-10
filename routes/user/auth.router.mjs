import { Router } from "express";
import { login, loginWithOtp, logout, refreshAccessToken, sendOtp, signup } from "../../controllers/user/auth.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = Router()

router.post('/signup', catchAsyncErrors(signup));
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/login-otp', loginWithOtp);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logout);
router.get('/test',(req,res)=>{
    res.status(200).json({ message: "Auth route is working" });
} );

export default router