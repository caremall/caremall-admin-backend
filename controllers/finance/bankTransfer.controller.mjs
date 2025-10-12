import BankTransfer from "../../models/finance/BankTransfer.mjs";

export const createTransfer = async (req, res) => {
  try {
    const payload = { ...req.body, createdBy: req.user?.id };
    const doc = await BankTransfer.create(payload);
    // TODO: create ledger entries for both banks
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getTransfers = async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const docs = await BankTransfer.find()
      .populate("fromBank toBank", "bankName accountNo")
      .populate("createdBy", "fullName")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ date: -1 });
    const total = await BankTransfer.countDocuments();
    res.json({ data: docs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTransferById = async (req, res) => {
  try {
    const doc = await BankTransfer.findById(req.params.id).populate(
      "fromBank toBank",
      "bankName accountNo"
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTransfer = async (req, res) => {
  try {
    const doc = await BankTransfer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteTransfer = async (req, res) => {
  try {
    await BankTransfer.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
