import DebitNote from "../../models/finance/DebitNote.mjs";

export const createDebitNote = async (req, res) => {
  try {
    const payload = { ...req.body, createdBy: req.user?.id };
    const doc = await DebitNote.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getDebitNotes = async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const docs = await DebitNote.find()
      .populate("customer", "code name")
      .populate("createdBy", "fullName")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ date: -1 });
    const total = await DebitNote.countDocuments();
    res.json({ data: docs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getDebitNoteById = async (req, res) => {
  try {
    const doc = await DebitNote.findById(req.params.id).populate("customer", "code name");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateDebitNote = async (req, res) => {
  try {
    const doc = await DebitNote.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const confirmDebitNote = async (req, res) => {
  try {
    const doc = await DebitNote.findByIdAndUpdate(req.params.id, { status: "Confirmed" }, { new: true });
    // TODO: create appropriate ledger postings
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteDebitNote = async (req, res) => {
  try {
    await DebitNote.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
