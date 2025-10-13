import ChartOfAccount from "../../models/finance/ChartOfAccounts.mjs";

export const createChart = async (req, res) => {
  try {
    const payload = req.body;
    const doc = await ChartOfAccount.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getCharts = async (req, res) => {
  try {
    const { page = 1, limit = 25, q } = req.query;
    const filter = q
      ? { $or: [{ name: new RegExp(q, "i") }, { code: new RegExp(q, "i") }] }
      : {};
    const docs = await ChartOfAccount.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ code: 1 });
    const total = await ChartOfAccount.countDocuments(filter);
    res.json({ data: docs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getChartById = async (req, res) => {
  try {
    const doc = await ChartOfAccount.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateChart = async (req, res) => {
  try {
    const doc = await ChartOfAccount.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteChart = async (req, res) => {
  try {
    await ChartOfAccount.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
