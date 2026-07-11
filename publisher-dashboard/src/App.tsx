import { useState, useEffect } from "react";
import "./App.css";

interface DashboardMetric {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down";
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "articles", label: "Articles", icon: "📰" },
  { id: "analytics", label: "Analytics", icon: "📈" },
  { id: "payments", label: "Payments", icon: "💳" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export function Dashboard() {
  const [activeNav, setActiveNav] = useState<string>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publisherName, setPublisherName] = useState<string>("News Publisher");
  const [metrics, setMetrics] = useState<DashboardMetric[]>([
    { label: "Total Earnings", value: "0 XLM", change: 0 },
    { label: "Articles Published", value: "0", change: 0 },
    { label: "Total Reads", value: "0", change: 0 },
    { label: "Average Price", value: "0 XLM", change: 0 },
  ]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>📊 Byline Publisher Dashboard</h1>
          <p className="subtitle">{publisherName}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-logout">🚪 Logout</button>
        </div>
      </header>

      <div className="dashboard-container">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeNav === item.id ? "active" : ""}`}
                onClick={() => setActiveNav(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="dashboard-content">
          {activeNav === "overview" && (
            <section className="section">
              <h2>Dashboard Overview</h2>
              <div className="metrics-grid">
                {metrics.map((metric, idx) => (
                  <div key={idx} className="metric-card">
                    <div className="metric-label">{metric.label}</div>
                    <div className="metric-value">{metric.value}</div>
                    {metric.change !== undefined && (
                      <div className={`metric-change ${metric.trend || ""}`}>
                        {metric.change > 0 ? "↑" : "↓"}{" "}
                        {Math.abs(metric.change)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="chart-placeholder">
                <div className="placeholder-content">
                  <h3>Earnings Over Time</h3>
                  <p>Chart visualization will appear here</p>
                </div>
              </div>
            </section>
          )}

          {activeNav === "articles" && (
            <section className="section">
              <div className="section-header">
                <h2>Your Articles</h2>
                <button className="btn btn-primary">+ New Article</button>
              </div>
              <div className="articles-list placeholder">
                <p>
                  No articles published yet. Create your first article to get
                  started!
                </p>
              </div>
            </section>
          )}

          {activeNav === "analytics" && (
            <section className="section">
              <h2>Analytics</h2>
              <div className="analytics-filters">
                <select className="filter-select">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>All time</option>
                </select>
              </div>
              <div className="chart-placeholder">
                <div className="placeholder-content">
                  <h3>Analytics Charts</h3>
                  <p>Detailed analytics will appear here</p>
                </div>
              </div>
            </section>
          )}

          {activeNav === "payments" && (
            <section className="section">
              <h2>Payment History</h2>
              <div className="payments-table placeholder">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={4} className="empty">
                        No payments recorded yet.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeNav === "settings" && (
            <section className="section">
              <h2>Settings</h2>
              <div className="settings-form">
                <div className="form-group">
                  <label>Publisher Name</label>
                  <input
                    type="text"
                    value={publisherName}
                    onChange={(e) => setPublisherName(e.target.value)}
                    placeholder="Your publisher name"
                  />
                </div>
                <button className="btn btn-primary">Save Settings</button>
              </div>
            </section>
          )}
        </main>
      </div>

      <footer className="dashboard-footer">
        <p>
          Powered by{" "}
          <a
            href="https://stellar.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Stellar
          </a>
        </p>
      </footer>
    </div>
  );
}

export default Dashboard;
