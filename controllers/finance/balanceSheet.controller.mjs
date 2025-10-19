import ChartOfAccount from "../../models/finance/ChartOfAccounts.mjs";
import Ledger from "../../models/finance/Ledger.mjs";

export const getBalanceSheet = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Fetch only Asset, Liability, and Equity accounts
    const accounts = await ChartOfAccount.find({
      accountType: { $in: ["Asset", "Liability", "Equity"] },
    }).sort({ code: 1 });

    const results = [];

    for (const acc of accounts) {
      const match = { accountId: acc._id };
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

      // Calculate balance based on type
      let balance = 0;
      if (acc.accountType === "Asset") balance = debit - credit;
      else balance = credit - debit;

      results.push({
        accountId: acc._id,
        code: acc.code,
        name: acc.name,
        accountType: acc.accountType,
        debit,
        credit,
        balance,
      });
    }

    // Group by type
    const assets = results.filter((a) => a.accountType === "Asset");
    const liabilities = results.filter((a) => a.accountType === "Liability");
    const equity = results.filter((a) => a.accountType === "Equity");

    // Totals
    const totalAssets = assets.reduce((a, b) => a + (b.debit - b.credit), 0);
    const totalLiabilities = liabilities.reduce((a, b) => a + (b.credit - b.debit), 0);
    const totalEquity = equity.reduce((a, b) => a + (b.credit - b.debit), 0);

    const totalDebit = totalAssets;
    const totalCredit = totalLiabilities + totalEquity;

    res.json({
      fromDate,
      toDate,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalDebit,
      totalCredit,
      difference: totalDebit - totalCredit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
