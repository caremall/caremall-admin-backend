import Payment from "../../models/finance/Payment.mjs";
import Receipt from "../../models/finance/Receipt.mjs";
import JournalEntry from "../../models/finance/JournalEntry.mjs";

export const getSOA = async (req, res) => {
  try {
    const { fromDate, toDate, partnerName, reportType = "summary", partnerType } = req.query;

    if (!partnerName || !partnerType) {
      return res.status(400).json({ message: "Partner name and type are required" });
    }

    const match = {
      date: { $gte: new Date(fromDate), $lte: new Date(toDate) },
      party: partnerName,
    };

    // Payments (for vendors)
    const payments = partnerType === "vendor" ? await Payment.find(match).lean() : [];
    // Receipts (for customers)
    const receipts = partnerType === "customer" ? await Receipt.find(match).lean() : [];
    // Journal Entries affecting this partner
    const journals = await JournalEntry.find({ date: { $gte: new Date(fromDate), $lte: new Date(toDate) } }).lean();

    // Combine
    const transactions = [
      ...payments.map((p) => ({
        date: p.date,
        type: "Payment",
        details: p.narration || "Payment made",
        amount: -Math.abs(p.docAmount),
      })),
      ...receipts.map((r) => ({
        date: r.date,
        type: "Receipt",
        details: r.narration || "Payment received",
        amount: Math.abs(r.docAmount),
      })),
      ...journals.map((j) => ({
        date: j.date,
        type: "Journal Entry",
        details: j.narration || "Adjustment",
        amount: j.totalDebitAmount - j.totalCreditAmount,
      })),
    ];

    // Sort by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate balances
    let openingBalance = 0;
    let balance = openingBalance;
    const detailedList = transactions.map((t) => {
      balance += t.amount;
      return { ...t, balance };
    });

    const invoicedAmount = transactions
      .filter((t) => t.type === "Journal Entry" && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const amountPaid = transactions
      .filter((t) => ["Payment", "Receipt"].includes(t.type))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const summary = {
      openingBalance,
      invoicedAmount,
      amountPaid,
      closingBalance: balance,
    };

    if (reportType === "summary") {
      return res.json({ partnerName, partnerType, fromDate, toDate, summary });
    }

    res.json({
      partnerName,
      partnerType,
      fromDate,
      toDate,
      summary,
      transactions: detailedList,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
