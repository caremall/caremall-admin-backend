import jwt from "jsonwebtoken";

export const generateAccessToken = (admin) => {
    const { _id, fullName, email, role } = admin;

    const accessToken = jwt.sign(
        { _id, fullName, email, role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
    )
    return accessToken;
}

export const generateRefreshToken = (admin) => {
    const { _id, fullName, email, role } = admin;
    const refreshToken = jwt.sign(
        { _id, fullName, email, role },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    )
    return refreshToken
}