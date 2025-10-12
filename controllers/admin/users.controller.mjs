import Users from "../../models/User.mjs";
// import FirstOrder from "../../models/FirstOrder.mjs";

export const createUser = async (req, res) => {
    const { name, email, password, phone } = req.body;

    const existingUser = await Users.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      let message = "";
      if (existingUser.email === email) message = "Email already exists.";
      if (existingUser.phone === phone)
        message = "Phone number already exists.";
      if (existingUser.email === email && existingUser.phone === phone) {
        message = "Email and phone number already exist.";
      }

      return res.status(400).json({ message });
    }

    const newUser = await Users.create({ name, email, password, phone });
    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
};

export const getAllUsers = async (req, res) => {
  console.log("this function will work");
  try {
    const users = await Users.find({})
    .populate("orders")
    .exec();
    res.status(200).json({ data: users, meta: {} });
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
      message: isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
};


// ✅ Create or replace first order discount
// export const createFirstOrderAmount = async (req, res) => {
//   try {
//     const { discountType, discountValue, minOrderValue } = req.body;

//     if (!discountType || !discountValue) {
//       return res.status(400).json({
//         success: false,
//         message: "Discount type and value are required",
//       });
//     }

//     // Remove any existing discount (only one rule active)
//     await FirstOrder.deleteMany({});

//     // Save new discount
//     const discount = await FirstOrder.create({
//       discountType,
//       discountValue,
//       minOrderValue,
//     });

//     return res.status(200).json({
//       success: true,
//       message: "First order discount saved successfully (previous replaced)",
//       data: discount,
//     });
//   } catch (error) {
//     console.error("Error saving first order discount:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while saving discount",
//     });
//   }
// };

// ✅ Get active first order discount
// export const getFirstOrderAmount = async (req, res) => {
//   try {
//     const discount = await FirstOrder.findOne();

//     if (!discount) {
//       return res.status(404).json({
//         success: false,
//         message: "No first order discount found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: discount,
//     });
//   } catch (error) {
//     console.error("Error fetching first order discount:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while fetching discount",
//     });
//   }
// };

