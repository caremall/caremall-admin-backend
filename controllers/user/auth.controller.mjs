import User from '../../models/User.mjs';
import { generateUserAccessToken, generateUserRefreshToken, verifyUserRefreshToken } from '../../utils/generateTokens.mjs';
import sendMail  from '../../utils/sendMail.mjs';
export const signup = async (req, res) => {
    const { name, email, password, phone } = req.body;
        const userExists = await User.findOne({ email })
        if (userExists) return res.status(200).json({ message: 'User already exists' })

        const mobileNumberExists = await User.findOne({ phone: phone })
        if (mobileNumberExists) res.status(200).json({ message: 'Mobile number is already taken' })

        const user = await User.create({ name, email, password, phone });
        const accessToken = generateUserAccessToken(user._id);
        const refreshToken = generateUserRefreshToken(user._id);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({ accessToken, user, message: 'Signed up successfully' })
   
};


export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ message: 'Email and Password is required' })

    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const accessToken = generateUserAccessToken(user._id);
        const refreshToken = generateUserRefreshToken(user._id);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        user.password = ''
        res.status(200).json({
            accessToken,
            user,
            message: 'Logged in successfully'
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Login failed' })
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
    if (!token) return res.status(401).json({ message: 'No refresh token' })

    try {
        const { userId } = verifyUserRefreshToken(token);
        const newAccessToken = generateUserAccessToken(userId);
        res.json({ accessToken: newAccessToken });
    } catch (err) {
        console.log(err)
        res.status(403).json({ message: 'Invalid or expired refresh token' })
    }
};

export const logout = (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' })
};
