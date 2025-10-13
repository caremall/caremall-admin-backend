import JournalEntry from "../../models/finance/JournalEntry.mjs";

export const createJournal = async (req, res) => {
  try {
    const payload = { ...req.body, createdBy: req.user?.id };
    // Validate that totalDebit === totalCredit before saving (recommended)
    const totalDebit = (payload.entries || []).reduce(
      (s, e) => s + (e.debit || 0),
      0
    );
    const totalCredit = (payload.entries || []).reduce(
      (s, e) => s + (e.credit || 0),
      0
    );
    if (totalDebit !== totalCredit) {
      return res
        .status(400)
        .json({ message: "Unbalanced journal entry (debits !== credits)" });
    }
    payload.totalDebit = totalDebit;
    payload.totalCredit = totalCredit;
    const doc = await JournalEntry.create(payload);
    // TODO: ledger posting hook
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getJournals = async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const docs = await JournalEntry.find()
      .populate("entries.account", "code name")
      .populate("createdBy", "fullName")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ date: -1 });
    const total = await JournalEntry.countDocuments();
    res.json({ data: docs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getJournalById = async (req, res) => {
  try {
    const doc = await JournalEntry.findById(req.params.id)
      .populate("entries.account", "code name")
      .populate("createdBy", "fullName");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateJournal = async (req, res) => {
  try {
    const payload = req.body;
    // Optional: revalidate totals if entries changed
    const doc = await JournalEntry.findByIdAndUpdate(req.params.id, payload, {
      new: true,
    });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteJournal = async (req, res) => {
  try {
    await JournalEntry.findByIdAndDelete(req.params.id);
    // TODO: reverse ledger entries if posted
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
