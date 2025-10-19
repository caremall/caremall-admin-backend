import Payment from "../../models/finance/Payment.mjs";
import Receipt from "../../models/finance/Receipt.mjs";
import JournalEntry from "../../models/finance/JournalEntry.mjs";

export const getCashFlow = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ message: "fromDate and toDate are required" });
    }

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);

    // Get cash-related transactions
    const payments = await Payment.find({
      date: { $gte: startDate, $lte: endDate },
    }).select("bankName paymentType docAmount narration");

    const receipts = await Receipt.find({
      date: { $gte: startDate, $lte: endDate },
    }).select("bankName receiptType docAmount narration");

    const journals = await JournalEntry.find({
      date: { $gte: startDate, $lte: endDate },
    }).select("entries narration");

    // Summarize inflows/outflows
    let inflows = 0;
    let outflows = 0;
    const categorySummary = {};

    // Receipts → Inflows
    receipts.forEach((r) => {
      inflows += r.docAmount;
      const key = r.bankName || "Cash Account";
      if (!categorySummary[key])
        categorySummary[key] = { inflows: 0, outflows: 0, net: 0 };
      categorySummary[key].inflows += r.docAmount;
    });

    // Payments → Outflows
    payments.forEach((p) => {
      outflows += p.docAmount;
      const key = p.bankName || "Cash Account";
      if (!categorySummary[key])
        categorySummary[key] = { inflows: 0, outflows: 0, net: 0 };
      categorySummary[key].outflows += p.docAmount;
    });

    // Journals → Internal adjustments (both inflow/outflow)
    journals.forEach((j) => {
      j.entries.forEach((e) => {
        const key = e.account || "Adjustment";
        if (!categorySummary[key])
          categorySummary[key] = { inflows: 0, outflows: 0, net: 0 };

        if (e.postingType === "Debit") {
          inflows += e.docAmount;
          categorySummary[key].inflows += e.docAmount;
        } else {
          outflows += e.docAmount;
          categorySummary[key].outflows += e.docAmount;
        }
      });
    });

    // Calculate net per category
    Object.keys(categorySummary).forEach((k) => {
      categorySummary[k].net =
        categorySummary[k].inflows - categorySummary[k].outflows;
    });

    // Opening/closing balance (simple running)
    const openingBalance = 0;
    const closingBalance = openingBalance + inflows - outflows;

    res.json({
      fromDate,
      toDate,
      openingBalance,
      inflows,
      outflows,
      closingBalance,
      categories: Object.entries(categorySummary).map(([key, val]) => ({
        category: key,
        inflows: val.inflows,
        outflows: val.outflows,
        net: val.net,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
