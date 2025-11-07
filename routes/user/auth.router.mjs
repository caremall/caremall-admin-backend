import { Router } from "express";
import {
  deleteAccount,
  editProfile,
  getLoggedInUserDetails,
  login,
  loginWithOtp,
  logout,
  refreshAccessToken,
  sendOrLoginOtp,
  // sendOtp,
  signup,
  verifyOtpAndLogin,
} from "../../controllers/user/auth.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";
import { verifyUserToken } from "../../middlewares/verifyToken.mjs";

const router = Router();

router.post("/signup", catchAsyncErrors(signup));
router.post("/login", login);
router.get("/me", verifyUserToken, getLoggedInUserDetails);
router.put("/edit-profile", verifyUserToken, editProfile);
// router.post("/send-otp", sendOtp);
router.post("/login-otp", loginWithOtp);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);
router.get("/test", (req, res) => {
  res.status(200).json({ message: "Auth route is working" });
});
router.delete("/delete-account", verifyUserToken, deleteAccount);

router.post("/send-otp", sendOrLoginOtp);
router.post("/verify-otp", verifyOtpAndLogin);

export default router;
