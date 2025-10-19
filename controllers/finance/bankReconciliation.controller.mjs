import Payment from "../../models/finance/Payment.mjs";
import Receipt from "../../models/finance/Receipt.mjs";

export const getBankReconciliation = async (req, res) => {
  try {
    const { fromDate, toDate, bankName, status } = req.query;

    const match = {};
    if (fromDate && toDate) {
      match.date = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }
    if (bankName) match.bankName = bankName;
    if (status) match.status = status;

    // Fetch Payments and Receipts (only bank related)
    const payments = await Payment.find(match)
      .select(
        "party bankName paymentType date chequeNo docAmount clearedDate status narration"
      )
      .lean();

    const receipts = await Receipt.find(match)
      .select(
        "bankName receiptType date chequeNo docAmount clearedDate status narration"
      )
      .lean();

    // Combine both
    const allTransactions = [
      ...payments.map((p) => ({
        type: "Payment",
        party: p.party,
        bankName: p.bankName,
        date: p.date,
        chequeNo: p.chequeNo || "-",
        docAmount: p.docAmount,
        clearedDate: p.clearedDate || null,
        status: p.status || "Pending",
        narration: p.narration,
      })),
      ...receipts.map((r) => ({
        type: "Receipt",
        bankName: r.bankName,
        date: r.date,
        chequeNo: r.chequeNo || "-",
        docAmount: r.docAmount,
        clearedDate: r.clearedDate || null,
        status: r.status || "Pending",
        narration: r.narration,
      })),
    ];

    // Sort by Date descending
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      fromDate,
      toDate,
      bankName,
      status,
      count: allTransactions.length,
      transactions: allTransactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH /api/bank-reconciliation/:id/clear
 * Mark payment/receipt as cleared
 */
export const clearBankTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, clearedDate } = req.body;

    let updated;

    if (type === "Payment") {
      updated = await Payment.findByIdAndUpdate(
        id,
        { status: "Cleared", clearedDate },
        { new: true }
      );
    } else if (type === "Receipt") {
      updated = await Receipt.findByIdAndUpdate(
        id,
        { status: "Cleared", clearedDate },
        { new: true }
      );
    }

    if (!updated)
      return res.status(404).json({ message: "Transaction not found" });

    res.json({ message: "Transaction marked as cleared", data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
