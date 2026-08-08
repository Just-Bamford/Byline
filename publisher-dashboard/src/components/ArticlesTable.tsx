import React from "react";
import { format, parseISO } from "date-fns";
import { Article } from "../types";
import { TrendingUp, Eye, DollarSign } from "lucide-react";

interface ArticlesTableProps {
  articles: Article[];
  isLoading?: boolean;
}

export const ArticlesTable: React.FC<ArticlesTableProps> = ({
  articles,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">Loading articles...</div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          No articles published yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Your Articles</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Title
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Article ID
              </th>
              <th className="px-6 py-3 text-center font-semibold text-gray-900">
                <div className="flex items-center justify-center gap-1">
                  <Eye className="h-4 w-4" />
                  Reads
                </div>
              </th>
              <th className="px-6 py-3 text-center font-semibold text-gray-900">
                <div className="flex items-center justify-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Revenue
                </div>
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Price
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Published
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {articles.map((article) => (
              <tr
                key={article.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {article.reads > 100 && (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    )}
                    <span className="font-medium text-gray-900 max-w-sm truncate">
                      {article.title}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                  {article.id}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="font-semibold text-gray-900">
                    {article.reads.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="font-semibold text-green-600">
                    ${article.revenue.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-900">
                      {article.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 uppercase">
                      {article.priceType === "usdc" ? "USDC" : "XLM"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600 text-xs">
                  {format(parseISO(article.publishedAt), "MMM dd, yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
