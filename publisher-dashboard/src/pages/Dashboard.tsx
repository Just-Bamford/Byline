import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Eye,
  FileText,
  TrendingUp,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { StatsCard } from "../components/StatsCard";
import { EarningsChart } from "../components/EarningsChart";
import { RegisterArticleForm } from "../components/RegisterArticleForm";
import { ArticlesTable } from "../components/ArticlesTable";
import { publisherApi } from "../services/api";
import {
  DashboardStats,
  Article,
  ArticleRegistrationInput,
  EarningsData,
} from "../types";

export const Dashboard: React.FC = () => {
  const [publisherAddress] = useState(
    () => localStorage.getItem("publisher_address") || "",
  );
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [earningsHistory, setEarningsHistory] = useState<EarningsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    if (!publisherAddress) {
      setError("No publisher address found");
      return;
    }

    try {
      const [statsData, articlesData, earningsData] = await Promise.all([
        publisherApi.getDashboardStats(publisherAddress),
        publisherApi.getArticles(publisherAddress),
        publisherApi.getEarningsHistory(publisherAddress, 30),
      ]);

      setStats(statsData);
      setArticles(articlesData);
      setEarningsHistory(earningsData);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [publisherAddress]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const handleArticleRegistration = async (input: ArticleRegistrationInput) => {
    try {
      await publisherApi.registerArticle(publisherAddress, input);
      // Refresh articles and stats
      await loadDashboardData();
    } catch (err) {
      throw err;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("publisher_address");
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <RefreshCw className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Publisher Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {publisherAddress.substring(0, 10)}...
                {publisherAddress.substring(publisherAddress.length - 10)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Total Earnings"
              value={`$${stats.totalEarnings.toFixed(2)}`}
              subtitle="All time"
              icon={DollarSign}
            />
            <StatsCard
              title="Total Reads"
              value={stats.totalReads.toLocaleString()}
              subtitle="Across all articles"
              icon={Eye}
            />
            <StatsCard
              title="Published Articles"
              value={stats.articleCount}
              subtitle="Active articles"
              icon={FileText}
            />
            {stats.topArticle && (
              <StatsCard
                title="Top Article"
                value={stats.topArticle.reads.toLocaleString()}
                subtitle={stats.topArticle.title}
                icon={TrendingUp}
              />
            )}
          </div>
        )}

        {/* Charts and Forms Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Earnings Chart - Spans 2 columns */}
          <div className="lg:col-span-2">
            <EarningsChart data={earningsHistory} isLoading={isLoading} />
          </div>

          {/* Article Registration Form */}
          <div>
            <RegisterArticleForm
              onSubmit={handleArticleRegistration}
              isLoading={isRefreshing}
            />
          </div>
        </div>

        {/* Articles Table */}
        <ArticlesTable articles={articles} isLoading={isLoading} />
      </main>
    </div>
  );
};
