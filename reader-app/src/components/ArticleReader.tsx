import { useState } from "react";
import { WalletManager } from "../lib/wallet";
import "./ArticleReader.css";

interface Article {
  id: string;
  title: string;
  author: string;
  price: number;
  content: string;
  publisher: string;
  publishedAt: string;
}

interface ArticleReaderProps {
  wallet: WalletManager;
  contractId: string;
}

const SAMPLE_ARTICLES: Article[] = [
  {
    id: "article-1",
    title: "The Future of Decentralized Journalism",
    author: "Jane Smith",
    price: 0.002,
    content:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    publisher: "Independent News",
    publishedAt: "2024-06-01",
  },
  {
    id: "article-2",
    title: "Micropayments: A New Era for Publishers",
    author: "John Doe",
    price: 0.001,
    content:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    publisher: "Tech Weekly",
    publishedAt: "2024-05-31",
  },
  {
    id: "article-3",
    title: "Why Stellar Powers the News Economy",
    author: "Alice Johnson",
    price: 0.003,
    content:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    publisher: "Crypto Insights",
    publishedAt: "2024-05-30",
  },
];

export function ArticleReader({ wallet, contractId }: ArticleReaderProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasedArticles, setPurchasedArticles] = useState<Set<string>>(
    new Set(),
  );

  const handlePurchaseArticle = async (article: Article) => {
    setLoading(true);
    setError(null);

    try {
      // In production, get publisher address from article metadata
      const publisherAddress =
        "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON";

      const token = await wallet.purchaseArticle(
        contractId,
        article.id,
        article.price,
        publisherAddress,
      );

      // Mark article as purchased
      setPurchasedArticles((prev) => new Set(prev).add(article.id));
      setSelectedArticle(article);

      // Store token in localStorage for verification
      localStorage.setItem(`token-${article.id}`, JSON.stringify(token));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to purchase article",
      );
    } finally {
      setLoading(false);
    }
  };

  const canReadArticle = (articleId: string) => {
    return purchasedArticles.has(articleId);
  };

  return (
    <div className="article-reader">
      <div className="articles-grid">
        <h2>Available Articles</h2>
        <div className="articles-list">
          {SAMPLE_ARTICLES.map((article) => (
            <div key={article.id} className="article-card">
              <div className="article-header">
                <h3>{article.title}</h3>
                <span className="price">${article.price.toFixed(3)}</span>
              </div>
              <p className="author">By {article.author}</p>
              <p className="publisher">{article.publisher}</p>
              <p className="date">{article.publishedAt}</p>

              {canReadArticle(article.id) ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setSelectedArticle(article)}
                >
                  Read Article
                </button>
              ) : (
                <button
                  className="btn btn-purchase"
                  onClick={() => handlePurchaseArticle(article)}
                  disabled={loading}
                >
                  {loading
                    ? "Processing..."
                    : `Buy for $${article.price.toFixed(3)}`}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {selectedArticle && canReadArticle(selectedArticle.id) && (
        <div className="article-content">
          <button
            className="btn btn-close"
            onClick={() => setSelectedArticle(null)}
          >
            ✕
          </button>
          <article>
            <h1>{selectedArticle.title}</h1>
            <div className="article-meta">
              <span>By {selectedArticle.author}</span>
              <span>{selectedArticle.publishedAt}</span>
            </div>
            <div className="article-body">{selectedArticle.content}</div>
          </article>
        </div>
      )}
    </div>
  );
}
