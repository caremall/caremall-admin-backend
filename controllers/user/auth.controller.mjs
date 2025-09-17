import Address from "../../models/Address.mjs";
import User from "../../models/User.mjs";
import {
  generateUserAccessToken,
  generateUserRefreshToken,
  verifyUserRefreshToken,
} from "../../utils/generateTokens.mjs";
import sendMail from "../../utils/sendMail.mjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";
export const signup = async (req, res) => {
  const { name, email, password, avatar, phone } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists)
    return res.status(409).json({ message: "User already exists" });

  const mobileNumberExists = await User.findOne({ phone: phone });
  if (mobileNumberExists)
    res.status(409).json({ message: "Mobile number is already taken" });
  let imageUrl = null;
  if (avatar) {
    imageUrl = await uploadBase64Image(avatar, "user-avatar/");
  }
  const user = await User.create({ name, email, password, avatar, phone });
  const accessToken = generateUserAccessToken(user._id);
  const refreshToken = generateUserRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "None",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res
    .status(201)
    .json({ accessToken, user, message: "Signed up successfully" });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.json({ message: "Email and Password is required" });

  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateUserAccessToken(user._id);
    const refreshToken = generateUserRefreshToken(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    user.password = "";
    res.status(200).json({
      accessToken,
      user,
      message: "Logged in successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Login failed" });
  }
};

export const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  user.otp = otp;
  user.otpExpires = Date.now() + 5 * 60 * 1000; // OTP valid for 5 min
  await user.save();

  try {
    await sendMail({
      email: user.email,
      subject: "Login OTP",
      template: "otp.ejs",
      mailData: { name: user.name, otp },
    });
    res.status(200).json({ message: "OTP sent to your email address" });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP email" });
  }
};

export const loginWithOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP are required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  if (
    user.otp !== Number(otp) ||
    !user.otpExpires ||
    user.otpExpires < Date.now()
  ) {
    return res.status(401).json({ message: "Invalid or expired OTP" });
  }

  // Clean up OTP
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  // Issue tokens (same as before)
  const accessToken = generateUserAccessToken(user._id);
  const refreshToken = generateUserRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  user.password = "";

  res.status(200).json({
    accessToken,
    user,
    message: "Logged in successfully with OTP",
  });
};

export const refreshAccessToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    const { userId } = verifyUserRefreshToken(token);
    const newAccessToken = generateUserAccessToken(userId);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.log(err);
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming user ID is available from auth middleware

    // Delete the user document by ID
    await User.findByIdAndDelete(userId);

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete account" });
  }
};

export const getLoggedInUserDetails = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming authentication middleware sets req.user

    // Fetch user excluding sensitive fields
    const user = await User.findById(userId).select(
      "-password -otp -otpExpires"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch all addresses for this user
    const addresses = await Address.find({ user: userId }).lean();

    res.status(200).json({
      success: true,
      user,
      addresses,
    });
  } catch (error) {
    console.error("Get Logged In User Details Error:", error);
    res.status(500).json({ message: "Failed to get user details" });
  }
};


export const editProfile = async (req, res) => {
  try {
    const userId = req.user._id; // Auth middleware must set req.user
    const { name, email, phone, avatar, password } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name.trim();

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists)
        return res.status(409).json({ message: "Email already in use" });
      user.email = email.toLowerCase().trim();
    }

    if (phone && phone !== user.phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists)
        return res.status(409).json({ message: "Phone number already in use" });
      user.phone = phone;
    }

    if (avatar) {
      if (avatar.startsWith("data:")) {
        // Base64 image string - upload to S3
        const avatarUrl = await uploadBase64Image(avatar);
        user.avatar = avatarUrl;
      } else if (avatar.startsWith("http")) {
        // Existing URL, keep it as is
        user.avatar = avatar;
      } else {
        return res.status(400).json({ message: "Invalid avatar format" });
      }
    }

    if (password) {
      user.password = password; // will be hashed automatically by schema pre-save hook
    }

    await user.save();

    // Remove sensitive info before sending response
    user.password = undefined;
    user.otp = undefined;
    user.otpExpires = undefined;

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Edit Profile Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
