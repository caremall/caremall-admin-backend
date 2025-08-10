import jwt from "jsonwebtoken";

//admin token generation
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

//user token generation
export const generateUserAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });
};

export const generateUserRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

export const verifyUserAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

export const verifyUserRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};
