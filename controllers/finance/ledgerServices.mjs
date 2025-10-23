import Ledger from "../../models/finance/Ledger.mjs";

export const postToLedger = async ({ entries = [], date, referenceId, referenceType, createdBy }) => {
  if (!Array.isArray(entries) || entries.length === 0) return;
  const docs = entries.map(e => ({
    date,
    account: e.account,
    debit: e.debit || 0,
    credit: e.credit || 0,
    narration: e.narration || "",
    referenceId,
    referenceType,
    createdBy,
  }));
  // Bulk insert
  await Ledger.insertMany(docs);
};

/**
 * Remove ledger rows for a transaction (used on delete)
 */
export const removeFromLedger = async (referenceId, referenceType) => {
  await Ledger.deleteMany({ referenceId, referenceType });
};

/**
 * Get ledger entries for an account (optionally date-filtered)
 * Also compute openingBalance (before fromDate), transactions in range, totals, and closingBalance.
 *
 * - accountId: ChartOfAccount _id
 * - fromDate, toDate: optional ISO date strings
 */
export const getAccountLedgerSummary = async ({ accountId, fromDate, toDate }) => {
  const filterInRange = { account: accountId };
  const filterBeforeFrom = { account: accountId };

  if (fromDate) {
    const from = new Date(fromDate);
    filterInRange.date = { $gte: from };
    filterBeforeFrom.date = { $lt: from };
  }
  if (toDate) {
    const to = new Date(toDate);
    filterInRange.date = filterInRange.date || {};
    filterInRange.date.$lte = to;
  }

  // Opening totals (before fromDate)
  const openingAgg = await Ledger.aggregate([
    { $match: filterBeforeFrom },
    {
      $group: {
        _id: null,
        totalDebit: { $sum: "$debit" },
        totalCredit: { $sum: "$credit" },
      },
    },
  ]);

  const opening = openingAgg[0] || { totalDebit: 0, totalCredit: 0 };
  const openingBalance = (opening.totalDebit || 0) - (opening.totalCredit || 0);

  // Entries in range
  const entries = await Ledger.find(filterInRange)
    .sort({ date: 1, createdAt: 1 })
    .populate("referenceId", "_id") // keep minimal; controllers can populate more if needed
    .lean();

  // Compute running totals and totals for the range
  let runningBalance = openingBalance;
  const formatted = entries.map(entry => {
    runningBalance = runningBalance + (entry.debit || 0) - (entry.credit || 0);
    return {
      _id: entry._id,
      date: entry.date,
      narration: entry.narration,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId ? entry.referenceId._id : null,
      debit: entry.debit || 0,
      credit: entry.credit || 0,
      runningBalance,
    };
  });

  // Totals in the range
  const totalsAgg = await Ledger.aggregate([
    { $match: filterInRange },
    {
      $group: {
        _id: null,
        totalDebit: { $sum: "$debit" },
        totalCredit: { $sum: "$credit" },
      },
    },
  ]);
  const rangeTotals = totalsAgg[0] || { totalDebit: 0, totalCredit: 0 };

  const closingBalance = openingBalance + (rangeTotals.totalDebit || 0) - (rangeTotals.totalCredit || 0);

  return {
    openingBalance,
    entries: formatted,
    totalDebitInRange: rangeTotals.totalDebit || 0,
    totalCreditInRange: rangeTotals.totalCredit || 0,
    closingBalance,
  };
};
