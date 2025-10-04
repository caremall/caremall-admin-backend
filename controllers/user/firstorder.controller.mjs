import mongoose from "mongoose";
import FirstOrder from "../../models/FirstOrder.mjs";



export const getFirstOrderAmount = async (req, res) => {
  try {
    const discount = await FirstOrder.findOne();

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "No first order discount found",
      });
    }

    return res.status(200).json({
      success: true,
      data: discount,
    });
  } catch (error) {
    console.error("Error fetching first order discount:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching discount",
    });
  }
};


