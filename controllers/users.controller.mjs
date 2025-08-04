import Users from '../models/User.mjs';


export const createUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    
    const existingUser = await Users.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      let message = '';
      if (existingUser.email === email) message = 'Email already exists.';
      if (existingUser.phone === phone) message = 'Phone number already exists.';
      if (existingUser.email === email && existingUser.phone === phone) {
        message = 'Email and phone number already exist.';
      }

      return res.status(400).json({ message });
    }

    const newUser = await Users.create({ name, email, password, phone });
    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
};

export const getAllUsers = async (req, res) => {
  console.log('this function will work');
  try {
    const users = await Users.find({});
    res.status(200).json({data:users,meta:{}});
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error });
  }
};


export const blockOrUnblockUser = async (req, res) => {

  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const updatedUser = await Users.findByIdAndUpdate(
      id,
      { isBlocked },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: isBlocked ? "User blocked successfully" : "User unblocked successfully",
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
};