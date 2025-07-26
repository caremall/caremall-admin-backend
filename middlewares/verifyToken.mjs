
import jwt from "jsonwebtoken"
import Admin from "../models/Admin.mjs"

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET

export const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers?.authorized || req.Headers?.authorized

        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized', auth: false })
        }

        const token = authHeader.split(' ')[1]

        jwt.verify(
            token,
            ACCESS_TOKEN_SECRET,
            async (err, decode) => {
                if (err) {
                    return res.status(403).json({ message: 'Forbidden', auth: false })
                } else {
                    const admin = await Admin.findById(decode._id).select('-password -encryptedPassword')
                    if (admin?.status !== 'active') {
                        res.status(403).json({ auth: false, message: 'You are banned from website' })
                    } else {
                        next()
                    }
                }

            }
        )

    } catch (error) {
        console.log(error);
        res.json({ success: false, error_msg: 'Internal server error' })
    }
}
