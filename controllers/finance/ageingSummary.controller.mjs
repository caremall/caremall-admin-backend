import Payment from "../../models/finance/Payment.mjs";
import Receipt from "../../models/finance/Receipt.mjs";
// import JournalEntry from "../models/JournalEntry.js";

export const getAgeingSummary = async (req, res) => {
  try {
    const { partnerType = "customer", asOnDate } = req.query;
    const today = asOnDate ? new Date(asOnDate) : new Date();

    // Fetch relevant transactions
    const payments =
      partnerType === "vendor" ? await Payment.find().lean() : [];
    const receipts =
      partnerType === "customer" ? await Receipt.find().lean() : [];

    // Combine both
    const transactions = [
      ...payments.map((p) => ({
        partner: p.party,
        type: "Payment",
        date: new Date(p.date),
        amount: -Math.abs(p.docAmount),
      })),
      ...receipts.map((r) => ({
        partner: r.party,
        type: "Receipt",
        date: new Date(r.date),
        amount: Math.abs(r.docAmount),
      })),
    ];

    // Group transactions by partner
    const grouped = {};
    transactions.forEach((t) => {
      if (!grouped[t.partner]) grouped[t.partner] = [];
      grouped[t.partner].push(t);
    });

    const ageingSummary = [];

    // For each partner, calculate outstanding and distribute in ageing buckets
    for (const [partner, trans] of Object.entries(grouped)) {
      let balance = 0;
      const buckets = {
        "0-30": 0,
        "31-60": 0,
        "61-90": 0,
        "91+": 0,
      };

      trans.forEach((t) => {
        const diffDays = Math.floor(
          (today - new Date(t.date)) / (1000 * 60 * 60 * 24)
        );
        balance += t.amount;

        if (diffDays <= 30) buckets["0-30"] += t.amount;
        else if (diffDays <= 60) buckets["31-60"] += t.amount;
        else if (diffDays <= 90) buckets["61-90"] += t.amount;
        else buckets["91+"] += t.amount;
      });

      ageingSummary.push({
        partner,
        balance,
        ...buckets,
      });
    }

    // Sort by largest balance
    ageingSummary.sort((a, b) => b.balance - a.balance);

    res.json({
      asOnDate: today,
      partnerType,
      count: ageingSummary.length,
      ageingSummary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
