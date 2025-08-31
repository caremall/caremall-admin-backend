import Subscriber from "../../models/Subscriber.mjs";
import sendMail from "../../utils/sendMail.mjs";
import crypto from "crypto";

export const subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({ message: "Email already subscribed" });
    }

  
    const token = crypto.randomBytes(32).toString("hex");

    
    await Subscriber.create({ email, confirmed: false, confirmationToken: token });

    const confirmationLink = `${process.env.BASE_URL}/api/v1/user/subscriber/confirm/${token}`

    await sendMail({
      email: email,
      subject: "Confirm your subscription",
      template: "confirmation.ejs",
      mailData: { confirmationLink, email },
    });

    res.status(200).json({ message: "Confirmation email sent. Please check your inbox." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const confirmSubscription = async (req, res) => {
  try {
    const { token } = req.params;

    
    const subscriber = await Subscriber.findOne({ confirmationToken: token });
    if (!subscriber) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

   
    subscriber.confirmed = true;
    subscriber.confirmationToken = undefined;
    await subscriber.save();

    res.status(200).json({ message: "Subscription confirmed successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};
