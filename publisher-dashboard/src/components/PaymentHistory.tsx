import { useState, useEffect } from "react";
import "./PaymentHistory.css";

interface Payment {
  id: string;
  date: string;
  amount: number;
  status: "pending" | "settled" | "failed";
  source: string;
  transactionId?: string;
}

export function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: "pay-1",
      date: "2024-06-15",
      amount: 2.45,
      status: "settled",
      source: "article-reads",
      transactionId: "tx_abc123",
    },
    {
      id: "pay-2",
      date: "2024-06-10",
      amount: 1.89,
      status: "settled",
      source: "article-reads",
      transactionId: "tx_def456",
    },
    {
      id: "pay-3",
      date: "2024-06-05",
      amount: 0.78,
      status: "pending",
      source: "article-reads",
    },
  ]);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");

  const filteredPayments =
    filterStatus === "all"
      ? payments
      : payments.filter((p) => p.status === filterStatus);

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortBy === "amount") {
      return b.amount - a.amount;
    }
    return 0;
  });

  const stats = {
    totalSettled: payments
      .filter((p) => p.status === "settled")
      .reduce((sum, p) => sum + p.amount, 0),
    totalPending: payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.amount, 0),
    totalFailed: payments
      .filter((p) => p.status === "failed")
      .reduce((sum, p) => sum + p.amount, 0),
  };

  const handleRetryPayment = (paymentId: string) => {
    console.log(`Retrying payment ${paymentId}`);
  };

  const handleExport = () => {
    const csv = [
      ["Date", "Amount", "Status", "Source", "Transaction ID"],
      ...sortedPayments.map((p) => [
        p.date,
        p.amount,
        p.status,
        p.source,
        p.transactionId || "N/A",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payment-history.csv";
    a.click();
  };

  return (
    <div className="payment-history">
      <div className="history-header">
        <h2>Payment History</h2>
        <button className="btn btn-secondary" onClick={handleExport}>
          📥 Export CSV
        </button>
      </div>

      <div className="payment-stats">
        <div className="stat-card">
          <span className="label">Settled</span>
          <span className="value">{stats.totalSettled.toFixed(4)} XLM</span>
          <span className="count">
            {payments.filter((p) => p.status === "settled").length} payments
          </span>
        </div>
        <div className="stat-card pending">
          <span className="label">Pending</span>
          <span className="value">{stats.totalPending.toFixed(4)} XLM</span>
          <span className="count">
            {payments.filter((p) => p.status === "pending").length} payments
          </span>
        </div>
        <div className="stat-card failed">
          <span className="label">Failed</span>
          <span className="value">{stats.totalFailed.toFixed(4)} XLM</span>
          <span className="count">
            {payments.filter((p) => p.status === "failed").length} payments
          </span>
        </div>
      </div>

      <div className="controls-section">
        <div className="filters">
          <label>Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="settled">Settled</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="sort">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Date (Newest)</option>
            <option value="amount">Amount (Highest)</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="payments-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount (XLM)</th>
              <th>Status</th>
              <th>Source</th>
              <th>Transaction ID</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedPayments.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  No payments found.
                </td>
              </tr>
            ) : (
              sortedPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.date}</td>
                  <td className="amount">{payment.amount.toFixed(4)}</td>
                  <td>
                    <span className={`badge ${payment.status}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td>{payment.source}</td>
                  <td className="tx-id">
                    {payment.transactionId ? (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${payment.transactionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on Stellar Expert"
                      >
                        {payment.transactionId}
                      </a>
                    ) : (
                      <span>Pending...</span>
                    )}
                  </td>
                  <td>
                    {payment.status === "failed" && (
                      <button
                        className="btn btn-small btn-retry"
                        onClick={() => handleRetryPayment(payment.id)}
                      >
                        Retry
                      </button>
                    )}
                    {payment.status === "settled" && <span>✓</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="payment-info">
        <h3>About Payments</h3>
        <ul>
          <li>
            <strong>Settled:</strong> Payment has been confirmed on the
            blockchain
          </li>
          <li>
            <strong>Pending:</strong> Payment is being processed (usually 5-60
            seconds)
          </li>
          <li>
            <strong>Failed:</strong> Payment encountered an error. Try again or
            contact support.
          </li>
        </ul>
      </div>
    </div>
  );
}
