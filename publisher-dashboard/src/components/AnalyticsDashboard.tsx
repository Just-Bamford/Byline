import { useState, useEffect } from "react";
import "./AnalyticsDashboard.css";

interface ArticleMetric {
  articleId: string;
  title: string;
  reads: number;
  revenue: number;
  avgPrice: number;
}

interface TimeSeriesData {
  date: string;
  revenue: number;
  reads: number;
}

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [articles, setArticles] = useState<ArticleMetric[]>([
    {
      articleId: "article-1",
      title: "The Future of Decentralized Journalism",
      reads: 245,
      revenue: 0.49,
      avgPrice: 0.002,
    },
    {
      articleId: "article-2",
      title: "Micropayments: A New Era for Publishers",
      reads: 189,
      revenue: 0.189,
      avgPrice: 0.001,
    },
    {
      articleId: "article-3",
      title: "Why Stellar Powers the News Economy",
      reads: 156,
      revenue: 0.468,
      avgPrice: 0.003,
    },
  ]);

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([
    { date: "Mon", revenue: 0.5, reads: 120 },
    { date: "Tue", revenue: 0.8, reads: 180 },
    { date: "Wed", revenue: 0.6, reads: 140 },
    { date: "Thu", revenue: 1.2, reads: 210 },
    { date: "Fri", revenue: 1.5, reads: 260 },
    { date: "Sat", revenue: 0.9, reads: 170 },
    { date: "Sun", revenue: 0.7, reads: 150 },
  ]);

  const totalRevenue = articles.reduce((sum, a) => sum + a.revenue, 0);
  const totalReads = articles.reduce((sum, a) => sum + a.reads, 0);
  const avgPrice = totalReads > 0 ? totalRevenue / totalReads : 0;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>Revenue Analytics</h2>
        <div className="time-range-selector">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="analytics-summary">
        <div className="summary-card">
          <span className="label">Total Revenue</span>
          <span className="value">{totalRevenue.toFixed(4)} XLM</span>
          <span className="subtitle">+12% from last period</span>
        </div>
        <div className="summary-card">
          <span className="label">Total Reads</span>
          <span className="value">{totalReads}</span>
          <span className="subtitle">+8% from last period</span>
        </div>
        <div className="summary-card">
          <span className="label">Average Price</span>
          <span className="value">{avgPrice.toFixed(4)} XLM</span>
          <span className="subtitle">Per read</span>
        </div>
      </div>

      <div className="chart-section">
        <h3>Revenue Trend</h3>
        <div className="chart-placeholder">
          <div className="mini-chart">
            {timeSeriesData.map((data, idx) => (
              <div key={idx} className="chart-bar">
                <div
                  className="bar-fill"
                  style={{
                    height: `${(data.revenue / Math.max(...timeSeriesData.map((d) => d.revenue))) * 100}%`,
                  }}
                  title={`${data.revenue} XLM`}
                ></div>
                <span className="bar-label">{data.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="articles-analytics">
        <h3>Top Articles by Revenue</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Article</th>
                <th>Reads</th>
                <th>Revenue</th>
                <th>Avg Price</th>
              </tr>
            </thead>
            <tbody>
              {articles
                .sort((a, b) => b.revenue - a.revenue)
                .map((article) => (
                  <tr key={article.articleId}>
                    <td className="article-title">{article.title}</td>
                    <td>{article.reads}</td>
                    <td className="revenue">
                      {article.revenue.toFixed(4)} XLM
                    </td>
                    <td>{article.avgPrice.toFixed(4)} XLM</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="reader-insights">
        <h3>Reader Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <span className="icon">👥</span>
            <span className="label">Unique Readers</span>
            <span className="value">{Math.ceil(totalReads * 0.7)}</span>
          </div>
          <div className="insight-card">
            <span className="icon">📖</span>
            <span className="label">Avg Reads Per Reader</span>
            <span className="value">
              {(totalReads / Math.ceil(totalReads * 0.7)).toFixed(1)}
            </span>
          </div>
          <div className="insight-card">
            <span className="icon">⏱️</span>
            <span className="label">Peak Read Time</span>
            <span className="value">2:30 PM</span>
          </div>
          <div className="insight-card">
            <span className="icon">🌍</span>
            <span className="label">Total Regions</span>
            <span className="value">24</span>
          </div>
        </div>
      </div>
    </div>
  );
}
