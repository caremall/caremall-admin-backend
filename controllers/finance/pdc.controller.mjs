import Receipt from "../../models/finance/Receipt.mjs";
import Payment from "../../models/finance/Payment.mjs";

export const getPDCList = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      dateType = "Cheque",
      status = "All",
      type = "All",
    } = req.query;

    const dateField = dateType === "Cheque" ? "chequeDate" : "date";
    const dateFilter = {};

    if (fromDate && toDate) {
      dateFilter[dateField] = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    const statusFilter =
      status !== "All"
        ? {
            status:
              status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
          }
        : {};

    const receiptFilter =
      type === "Payment" ? {} : { ...dateFilter, ...statusFilter };
    const paymentFilter =
      type === "Receipt" ? {} : { ...dateFilter, ...statusFilter };

    const receipts = await Receipt.find(receiptFilter)
    //   .populate("bank fromAccount")
      .lean();
    const payments = await Payment.find(paymentFilter)
    //   .populate("bank toAccount")
      .lean();

    const combined = [
      ...receipts.map((r) => ({
        id: r._id,
        type: "Receipt",
        documentNo: r.documentNo,
        documentDate: r.date,
        chequeDate: r.chequeDate,
        chequeNo: r.chequeNo,
        narration: r.narration || "-",
        amount: r.amount,
        status: r.status,
      })),
      ...payments.map((p) => ({
        id: p._id,
        type: "Payment",
        documentNo: p.documentNo,
        documentDate: p.date,
        chequeDate: p.chequeDate,
        chequeNo: p.chequeNo,
        narration: p.narration || "-",
        amount: p.amount,
        status: p.status,
      })),
    ];

    // Sort by cheque date (latest first)
    combined.sort((a, b) => new Date(b.chequeDate) - new Date(a.chequeDate));

    res.status(200).json(combined);
  } catch (error) {
    console.error("Error fetching PDC list:", error);
    res.status(500).json({ message: "Server error while fetching PDC list" });
  }
};
