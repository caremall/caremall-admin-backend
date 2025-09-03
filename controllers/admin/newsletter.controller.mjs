import Subscriber from "../../models/Subscriber.mjs";

export const getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find()
      .select("-confirmationToken") 
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: subscribers.length,
      subscribers,
    });
  } catch (error) {
    console.error("Fetch Subscribers Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscribers",
      error: error.message,
    });
  }
};
