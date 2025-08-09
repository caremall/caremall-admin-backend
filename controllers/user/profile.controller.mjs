import User from "../../models/User.mjs";

export const updateProfile = async (req, res) => {
    try {
        const { name, phone, avatar } = req.body;
        const user = await User.findById(req.user._id);

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (avatar) user.avatar = avatar;

        await user.save();

        res.status(200).json({ message: 'Profile updated', user });
    } catch (error) {
        res.status(500).json({ message: 'Update failed' });
    }
};
