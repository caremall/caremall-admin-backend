import ChartOfAccount from "../../models/finance/ChartOfAccounts.mjs";
import { getAccountLedgerSummary } from "./ledgerServices.mjs";

export const getLedgerByAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { fromDate, toDate } = req.query;

    const account = await ChartOfAccount.findById(accountId);
    if (!account) return res.status(404).json({ message: "Account not found" });

    const summary = await getAccountLedgerSummary({
      accountId,
      fromDate,
      toDate,
    });

    // Format response to match UI: opening, transactions, totals, closing
    res.json({
      account: { id: account._id, code: account.code, name: account.name },
      openingBalance: summary.openingBalance,
      totalDebit: summary.totalDebitInRange,
      totalCredit: summary.totalCreditInRange,
      closingBalance: summary.closingBalance,
      entries: summary.entries,
      count: summary.entries.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getLedgerSummary = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Fetch all Chart of Accounts
    const accounts = await ChartOfAccount.find({}, "_id code name").sort({
      code: 1,
    });

    // For each account, calculate totals using same service
    const summaries = [];
    for (const acc of accounts) {
      const s = await getAccountLedgerSummary({
        accountId: acc._id,
        fromDate,
        toDate,
      });

      // Skip accounts that have no ledger activity
      if (
        s.openingBalance === 0 &&
        s.totalDebitInRange === 0 &&
        s.totalCreditInRange === 0
      )
        continue;

      summaries.push({
        accountId: acc._id,
        code: acc.code,
        name: acc.name,
        openingBalance: s.openingBalance,
        totalDebit: s.totalDebitInRange,
        totalCredit: s.totalCreditInRange,
        closingBalance: s.closingBalance,
      });
    }

    // Totals across all accounts (for footer row)
    const totalDebit = summaries.reduce((t, a) => t + (a.totalDebit || 0), 0);
    const totalCredit = summaries.reduce((t, a) => t + (a.totalCredit || 0), 0);

    res.json({
      fromDate,
      toDate,
      accounts: summaries,
      totalDebit,
      totalCredit,
      difference: totalDebit - totalCredit, // should be 0 if balanced
      count: summaries.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
