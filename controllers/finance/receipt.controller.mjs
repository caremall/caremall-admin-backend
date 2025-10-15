import Receipt from "../../models/finance/Receipt.mjs";

export const createReceipt = async (req, res) => {
  try {
    const payload = { ...req.body, createdBy: req.user?.id };
    const doc = await Receipt.create(payload);
    // TODO: ledger generation hook
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getReceipts = async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const docs = await Receipt.find()
      .populate("bank", "bankName accountNo")
      .populate("fromAccount", "code name")
      .populate("createdBy", "fullName")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ date: -1 });
    const total = await Receipt.countDocuments();
    res.json({ data: docs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getReceiptById = async (req, res) => {
  try {
    const doc = await Receipt.findById(req.params.id)
      .populate("bank", "bankName accountNo")
      .populate("fromAccount", "code name")
      .populate("createdBy", "fullName");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateReceipt = async (req, res) => {
  try {
    const doc = await Receipt.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteReceipt = async (req, res) => {
  try {
    await Receipt.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
