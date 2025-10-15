import BankMaster from "../../models/finance/BankMaster.mjs";

export const createBank = async (req, res) => {
  try {
    const doc = await BankMaster.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getBanks = async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const docs = await BankMaster.find()
      .populate("glAccount", "code name")
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await BankMaster.countDocuments();
    res.json({ data: docs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBankById = async (req, res) => {
  try {
    const doc = await BankMaster.findById(req.params.id).populate(
      "glAccount",
      "code name"
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateBank = async (req, res) => {
  try {
    const doc = await BankMaster.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteBank = async (req, res) => {
  try {
    await BankMaster.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
