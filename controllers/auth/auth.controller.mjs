import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Admin from '../../models/Admin.mjs'
import { generateAccessToken, generateRefreshToken } from '../../utils/generateTokens.mjs'

//⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡

export const login = async (req, res) => {
    try {
        const { email, password } = req.body

        const admin = await Admin.findOne({ email })

        if (!admin) return res.status(404).json({ message: 'Admin not found' })

        const isMatch = await bcrypt.compare(password, admin.password)

        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' })

        const token = generateAccessToken(admin)
        const refreshToken = generateRefreshToken(admin)

        // Send refresh token in cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        })

        admin.password = undefined // Remove password from response
        admin.encryptedPassword = undefined // Remove encrypted password from response

        if (admin.role !== 'superAdmin') admin.populate('role')

        res.status(200).json({ message: 'Login successful', admin, token })
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Internal server error' })
    }
}

export const refresh = async (req, res) => {

    try {
        const token = req.cookies.refreshToken

        if (!token) return res.status(401).json({ message: 'No refresh token provided' })

        jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
            if (err) return res.status(403).json({ message: 'Invalid refresh token' })
            const admin = await Admin.findById(decoded._id).select('-password')

            const token = generateAccessToken(admin)

            res.status(200).json({ message: 'Welcome Back Admin', admin, token })
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Token refresh failed' })
    }
}

export const logout = async (req, res) => {
    try {
        const cookies = req.cookies
        if (!cookies?.user) return res.sendStatus(204) //No content
        res.clearCookie('user', {
            httpOnly: true,
            sameSite: 'None',
            secure: true
        }).json({ success: true })
    } catch (error) {
        console.log(error);
        res.send({ success: false, message: 'Internal server error' })
    }
}
