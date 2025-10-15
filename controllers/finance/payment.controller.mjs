import Payment from "../../models/finance/Payment.mjs";

export const createPayment = async (req, res) => {
  try {
    const payload = { ...req.body, createdBy: req.user?.id };
    const doc = await Payment.create(payload);
    // TODO: hook -> generate ledger entries / update balances
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 25, q, status } = req.query;
    const filter = {};
    if (q)
      filter.$or = [
        { paymentCategory: new RegExp(q, "i") },
        { party: new RegExp(q, "i") },
      ];
    if (status) filter.status = status;
    const docs = await Payment.find(filter)
      .populate("party", "code name")
      .populate("bank", "bankName accountNo")
      .populate("createdBy", "fullName email")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ date: -1 });
    const total = await Payment.countDocuments(filter);
    res.json({ data: docs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const doc = await Payment.findById(req.params.id)
      .populate("party", "code name")
      .populate("bank", "bankName accountNo")
      .populate("createdBy", "fullName email");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updatePayment = async (req, res) => {
  try {
    const doc = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    // TODO: if status changed -> update ledger / balances
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deletePayment = async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    // TODO: remove ledger entries if any (business decision)
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
