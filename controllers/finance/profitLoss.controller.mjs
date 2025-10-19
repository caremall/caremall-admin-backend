import ChartOfAccount from "../../models/finance/ChartOfAccounts.mjs";
import Ledger from "../../models/finance/Ledger.mjs";

export const getProfitLoss = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Fetch Income & Expense accounts only
    const accounts = await ChartOfAccount.find({
      accountType: { $in: ["Income", "Expense"] },
    }).sort({ code: 1 });

    const results = [];

    for (const acc of accounts) {
      const match = { accountId: acc._id };
      if (fromDate && toDate) {
        match.date = { $gte: new Date(fromDate), $lte: new Date(toDate) };
      }

      // Aggregate debit/credit per account
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
        accountType: acc.accountType,
        debit,
        credit,
      });
    }

    // Separate Income & Expense
    const income = results.filter((r) => r.accountType === "Income");
    const expense = results.filter((r) => r.accountType === "Expense");

    // Totals
    const totalIncome = income.reduce((a, b) => a + (b.credit - b.debit), 0);
    const totalExpense = expense.reduce((a, b) => a + (b.debit - b.credit), 0);
    const netResult = totalIncome - totalExpense;

    res.json({
      fromDate,
      toDate,
      income,
      expense,
      totalIncome,
      totalExpense,
      netResult,
      netType: netResult >= 0 ? "Profit" : "Loss",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
