import ChartOfAccount from "../../models/finance/ChartOfAccounts.mjs";
import Ledger from "../../models/finance/Ledger.mjs";

export const getTrialBalance = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Fetch all accounts
    const accounts = await ChartOfAccount.find().sort({ code: 1 });

    const results = [];

    for (const acc of accounts) {
      // Calculate debit & credit for this account
      const match = {
        accountId: acc._id,
      };
      if (fromDate && toDate) {
        match.date = { $gte: new Date(fromDate), $lte: new Date(toDate) };
      }

      const agg = await Ledger.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$accountId",
            totalDebit: { $sum: "$debit" },
            totalCredit: { $sum: "$credit" },
          },
        },
      ]);

      const debit = agg.length ? agg[0].totalDebit : 0;
      const credit = agg.length ? agg[0].totalCredit : 0;

      results.push({
        accountId: acc._id,
        code: acc.code,
        name: acc.name,
        classification: acc.classification || "General",
        accountType: acc.accountType,
        debit,
        credit,
      });
    }

    // Group by Classification (Asset, Liability, etc.)
    const grouped = {};
    for (const r of results) {
      if (!grouped[r.accountType]) grouped[r.accountType] = [];
      grouped[r.accountType].push(r);
    }

    // Totals
    const totalDebit = results.reduce((a, b) => a + b.debit, 0);
    const totalCredit = results.reduce((a, b) => a + b.credit, 0);

    res.json({
      fromDate,
      toDate,
      totalDebit,
      totalCredit,
      difference: totalDebit - totalCredit,
      grouped,
      count: results.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
