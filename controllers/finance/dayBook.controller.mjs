import Payment from "../../models/finance/Payment.mjs";
import Receipt from "../../models/finance/Receipt.mjs";
import JournalEntry from "../../models/finance/JournalEntry.mjs";

export const getDayBook = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ message: "Please provide fromDate and toDate" });
    }

    const filter = {
      date: { $gte: new Date(fromDate), $lte: new Date(toDate) },
    };

    // ✅ Populate references from ChartOfAccount and BankMaster
    const payments = await Payment.find(filter)
      .populate("party", "name code") // populate party details
      .populate("bank", "name code")  // optional: populate bank info
      .select("date party paymentType docAmount narration")
      .lean();

    const receipts = await Receipt.find(filter)
      .populate("fromAccount", "name code") // populate fromAccount details
      .populate("bank", "name code")
      .select("date bank receiptType docAmount narration fromAccount")
      .lean();

    const journals = await JournalEntry.find(filter)
      .populate("entries.account", "name code") // populate account inside entries array
      .select("date voucher narration entries")
      .lean();

    // ✅ Format unified response
    const dayBookEntries = [
      ...payments.map((p) => ({
        type: "Payment",
        date: p.date,
        reference: p.paymentType,
        party: p.party?.name || "Unknown Party",
        debit: p.docAmount,
        credit: 0,
        narration: p.narration,
      })),
      ...receipts.map((r) => ({
        type: "Receipt",
        date: r.date,
        reference: r.receiptType,
        party: r.fromAccount?.name || "Unknown Account",
        debit: 0,
        credit: r.docAmount,
        narration: r.narration,
      })),
      ...journals.flatMap((j) =>
        j.entries.map((e) => ({
          type: "Journal Entry",
          date: j.date,
          reference: j.voucher || "Manual Entry",
          party: e.account?.name || "Unknown Account",
          debit: e.debit || 0,
          credit: e.credit || 0,
          narration: j.narration,
        }))
      ),
    ];

    // ✅ Sort and summarize
    dayBookEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalDebit = dayBookEntries.reduce((t, e) => t + e.debit, 0);
    const totalCredit = dayBookEntries.reduce((t, e) => t + e.credit, 0);

    res.json({
      fromDate,
      toDate,
      count: dayBookEntries.length,
      totalDebit,
      totalCredit,
      difference: totalDebit - totalCredit,
      entries: dayBookEntries,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
