import CreditNote from "../../models/finance/CreditNote.mjs";

export const createCreditNote = async (req, res) => {
  try {
    const payload = { ...req.body, createdBy: req.user?.id };
    const doc = await CreditNote.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getCreditNotes = async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const docs = await CreditNote.find()
      .populate("customer", "code name")
      .populate("createdBy", "fullName")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ date: -1 });
    const total = await CreditNote.countDocuments();
    res.json({ data: docs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCreditNoteById = async (req, res) => {
  try {
    const doc = await CreditNote.findById(req.params.id).populate(
      "customer",
      "code name"
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateCreditNote = async (req, res) => {
  try {
    const doc = await CreditNote.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const confirmCreditNote = async (req, res) => {
  try {
    const doc = await CreditNote.findByIdAndUpdate(
      req.params.id,
      { status: "Confirmed" },
      { new: true }
    );
    // TODO: ledger entries for credit note
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteCreditNote = async (req, res) => {
  try {
    await CreditNote.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
