import Payment from "../../models/finance/Payment.mjs";
import Receipt from "../../models/finance/Receipt.mjs";
import JournalEntry from "../../models/finance/JournalEntry.mjs";

import ChartOfAccount from "../../models/finance/ChartOfAccounts.mjs";

export const getSOA = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      partnerName,
      reportType = "summary",
      partnerType,
    } = req.query;

    if (!partnerName || !partnerType) {
      return res
        .status(400)
        .json({ message: "Partner name and type are required" });
    }

    const match = {
      date: { $gte: new Date(fromDate), $lte: new Date(toDate) },
      party: partnerName,
    };

    // Payments (for vendors)
    const payments =
      partnerType === "vendor" ? await Payment.find(match).lean() : [];
    // Receipts (for customers)
    const receipts =
      partnerType === "customer" ? await Receipt.find(match).lean() : [];
    // Journal Entries affecting this partner
    const journals = await JournalEntry.find({
      date: { $gte: new Date(fromDate), $lte: new Date(toDate) },
    }).lean();

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

export const getPartners = async (req, res) => {
  try {
    // Step 1: Collect unique ObjectIds from both collections
    const paymentParties = await Payment.distinct("party");
    const receiptParties = await Receipt.distinct("fromAccount");

    // Step 2: Merge and remove duplicates
    const allIds = [...new Set([...paymentParties, ...receiptParties])];

    if (!allIds.length) {
      return res.status(404).json({
        message: "No partners found in Payment or Receipt collections.",
      });
    }

    // Step 3: Fetch partner names from ChartOfAccount
    const partners = await ChartOfAccount.find(
      { _id: { $in: allIds } },
      {
        _id: 1,
        code: 1,
        name: 1,
        accountType: 1,
        subType: 1,
        classification: 1,
      }
    ).lean();

    // Step 4: Respond with formatted list
    res.status(200).json({
      count: partners.length,
      partners: partners.map((p) => ({
        id: p._id,
        code: p.code,
        name: p.name,
        accountType: p.accountType || null,
        subType: p.subType || null,
        classification: p.classification || null,
      })),
    });
  } catch (err) {
    console.error("Error fetching partners:", err);
    res.status(500).json({ message: err.message });
  }
};

// import ChartOfAccount from "../../models/finance/ChartOfAccounts.mjs";

// export const getPartners = async (req, res) => {
//   try {
//     // Optional filter: only include Customer and Vendor accounts
//     const partners = await ChartOfAccount.find(
//       {},
//       {
//         _id: 1,
//         code: 1,
//         name: 1,
//         accountType: 1,
//         subType: 1,
//         classification: 1,
//       }
//     ).lean();

//     if (!partners.length) {
//       return res
//         .status(404)
//         .json({ message: "No partners found in Chart of Accounts." });
//     }

//     res.status(200).json({
//       count: partners.length,
//       partners: partners.map((p) => ({
//         id: p._id,
//         code: p.code,
//         name: p.name,
//         type: p.accountType,
//         subType: p.subType || null,
//         classification: p.classification || null,
//       })),
//     });
//   } catch (err) {
//     console.error("Error fetching partners:", err);
//     res.status(500).json({ message: err.message });
//   }
// };
