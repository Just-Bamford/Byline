import { useState, useEffect } from "react";
import { WalletManager } from "../lib/wallet";
import "./ArticleReader.css";

interface Article {
  id: string;
  title: string;
  author: string;
  excerpt: string;
  price: number;
  content: string;
  publisher: string;
  publishedAt: string;
  category: string;
  readTime: number;
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
    excerpt: "How blockchain is reshaping the news industry",
    price: 0.002,
    content:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    publisher: "Independent News",
    publishedAt: "2024-06-01",
    category: "Technology",
    readTime: 5,
  },
  {
    id: "article-2",
    title: "Micropayments: A New Era for Publishers",
    author: "John Doe",
    excerpt: "Why pay-per-article models are gaining traction",
    price: 0.001,
    content:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    publisher: "Tech Weekly",
    publishedAt: "2024-05-31",
    category: "Business",
    readTime: 4,
  },
  {
    id: "article-3",
    title: "Why Stellar Powers the News Economy",
    author: "Alice Johnson",
    excerpt: "Stellar blockchain enables fast, cheap micropayments",
    price: 0.003,
    content:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    publisher: "Crypto Insights",
    publishedAt: "2024-05-30",
    category: "Crypto",
    readTime: 6,
  },
];

export function ArticleReader({ wallet, contractId }: ArticleReaderProps) {
  const [articles, setArticles] = useState<Article[]>(SAMPLE_ARTICLES);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasedArticles, setPurchasedArticles] = useState<Set<string>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Load purchased articles from localStorage on mount
  useEffect(() => {
    const purchased = new Set<string>();
    SAMPLE_ARTICLES.forEach((article) => {
      if (localStorage.getItem(`token-${article.id}`)) {
        purchased.add(article.id);
      }
    });
    setPurchasedArticles(purchased);
  }, []);

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["All", ...new Set(articles.map((a) => a.category))];

  const handlePurchaseArticle = async (article: Article) => {
    setLoading(true);
    setError(null);

    try {
      const publisherAddress =
        "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON";

      // Show purchase confirmation
      const confirmed = window.confirm(
        `Purchase "${article.title}" for ${article.price.toFixed(4)} XLM?`,
      );
      if (!confirmed) {
        setLoading(false);
        return;
      }

      // Execute purchase
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

      // Show success message
      console.log(`✅ Purchase successful for ${article.id}`);
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
        <div className="articles-header">
          <h2>Discover Articles</h2>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="category-filter">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="articles-list">
          {filteredArticles.map((article) => (
            <div key={article.id} className="article-card">
              <div className="article-header">
                <div className="article-title-info">
                  <h3>{article.title}</h3>
                  <p className="excerpt">{article.excerpt}</p>
                </div>
                <span className="price">{article.price.toFixed(4)} XLM</span>
              </div>

              <div className="article-meta">
                <span className="author">By {article.author}</span>
                <span className="publisher">{article.publisher}</span>
                <span className="category">{article.category}</span>
                <span className="read-time">{article.readTime} min read</span>
              </div>

              <div className="article-date">{article.publishedAt}</div>

              {canReadArticle(article.id) ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setSelectedArticle(article)}
                >
                  📖 Read Article
                </button>
              ) : (
                <button
                  className="btn btn-purchase"
                  onClick={() => handlePurchaseArticle(article)}
                  disabled={loading}
                >
                  {loading
                    ? "Processing..."
                    : `🛒 Buy for ${article.price.toFixed(4)} XLM`}
                </button>
              )}
            </div>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="no-articles">
            <p>No articles found matching your search.</p>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {selectedArticle && canReadArticle(selectedArticle.id) && (
        <div className="article-modal">
          <div className="modal-overlay"></div>
          <div className="article-content">
            <button
              className="btn btn-close"
              onClick={() => setSelectedArticle(null)}
            >
              ✕
            </button>
            <article>
              <h1>{selectedArticle.title}</h1>
              <div className="article-full-meta">
                <span>By {selectedArticle.author}</span>
                <span>{selectedArticle.publishedAt}</span>
                <span>{selectedArticle.readTime} min read</span>
              </div>
              <div className="article-body">{selectedArticle.content}</div>
              <footer className="article-footer">
                <p>Published by {selectedArticle.publisher}</p>
              </footer>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}
