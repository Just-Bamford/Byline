import { useState } from "react";
import "./ArticleManager.css";

interface Article {
  id: string;
  title: string;
  excerpt: string;
  price: number;
  status: "published" | "draft" | "archived";
  reads: number;
  revenue: number;
  publishedAt: string;
}

export function ArticleManager() {
  const [articles, setArticles] = useState<Article[]>([
    {
      id: "article-1",
      title: "The Future of Decentralized Journalism",
      excerpt: "How blockchain is reshaping the news industry",
      price: 0.002,
      status: "published",
      reads: 245,
      revenue: 0.49,
      publishedAt: "2024-06-01",
    },
    {
      id: "article-2",
      title: "Micropayments: A New Era for Publishers",
      excerpt: "Why pay-per-article models are gaining traction",
      price: 0.001,
      status: "published",
      reads: 189,
      revenue: 0.189,
      publishedAt: "2024-05-31",
    },
  ]);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showNewArticleForm, setShowNewArticleForm] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: "",
    excerpt: "",
    price: 0.001,
  });

  const filteredArticles =
    filterStatus === "all"
      ? articles
      : articles.filter((a) => a.status === filterStatus);

  const handleCreateArticle = () => {
    if (newArticle.title && newArticle.excerpt) {
      const article: Article = {
        id: `article-${Date.now()}`,
        title: newArticle.title,
        excerpt: newArticle.excerpt,
        price: newArticle.price,
        status: "draft",
        reads: 0,
        revenue: 0,
        publishedAt: new Date().toISOString().split("T")[0],
      };
      setArticles([...articles, article]);
      setNewArticle({ title: "", excerpt: "", price: 0.001 });
      setShowNewArticleForm(false);
    }
  };

  const handleUpdatePrice = (articleId: string, newPrice: number) => {
    setArticles(
      articles.map((a) => (a.id === articleId ? { ...a, price: newPrice } : a)),
    );
  };

  const handlePublish = (articleId: string) => {
    setArticles(
      articles.map((a) =>
        a.id === articleId ? { ...a, status: "published" } : a,
      ),
    );
  };

  const handleArchive = (articleId: string) => {
    setArticles(
      articles.map((a) =>
        a.id === articleId ? { ...a, status: "archived" } : a,
      ),
    );
  };

  return (
    <div className="article-manager">
      <div className="manager-header">
        <h2>Article Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowNewArticleForm(!showNewArticleForm)}
        >
          {showNewArticleForm ? "Cancel" : "+ Create Article"}
        </button>
      </div>

      {showNewArticleForm && (
        <div className="new-article-form">
          <h3>Create New Article</h3>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={newArticle.title}
              onChange={(e) =>
                setNewArticle({ ...newArticle, title: e.target.value })
              }
              placeholder="Article title"
            />
          </div>
          <div className="form-group">
            <label>Excerpt</label>
            <textarea
              value={newArticle.excerpt}
              onChange={(e) =>
                setNewArticle({ ...newArticle, excerpt: e.target.value })
              }
              placeholder="Brief description of article"
              rows={3}
            ></textarea>
          </div>
          <div className="form-group">
            <label>Price (XLM)</label>
            <input
              type="number"
              value={newArticle.price}
              onChange={(e) =>
                setNewArticle({
                  ...newArticle,
                  price: parseFloat(e.target.value),
                })
              }
              step="0.001"
              min="0"
            />
          </div>
          <button className="btn btn-primary" onClick={handleCreateArticle}>
            Create Article
          </button>
        </div>
      )}

      <div className="filter-controls">
        <button
          className={`filter-btn ${filterStatus === "all" ? "active" : ""}`}
          onClick={() => setFilterStatus("all")}
        >
          All ({articles.length})
        </button>
        <button
          className={`filter-btn ${filterStatus === "published" ? "active" : ""}`}
          onClick={() => setFilterStatus("published")}
        >
          Published ({articles.filter((a) => a.status === "published").length})
        </button>
        <button
          className={`filter-btn ${filterStatus === "draft" ? "active" : ""}`}
          onClick={() => setFilterStatus("draft")}
        >
          Draft ({articles.filter((a) => a.status === "draft").length})
        </button>
      </div>

      <div className="articles-list">
        {filteredArticles.length === 0 ? (
          <div className="empty-state">
            <p>
              No articles{" "}
              {filterStatus !== "all" ? `in ${filterStatus} status` : "yet"}.
            </p>
          </div>
        ) : (
          filteredArticles.map((article) => (
            <div key={article.id} className="article-item">
              <div className="article-info">
                <h4>{article.title}</h4>
                <p className="excerpt">{article.excerpt}</p>
                <div className="article-meta">
                  <span className={`status ${article.status}`}>
                    {article.status}
                  </span>
                  <span className="reads">📖 {article.reads} reads</span>
                  <span className="revenue">
                    💰 {article.revenue.toFixed(4)} XLM
                  </span>
                  <span className="date">{article.publishedAt}</span>
                </div>
              </div>

              <div className="article-actions">
                <div className="price-control">
                  <label>Price (XLM)</label>
                  <input
                    type="number"
                    value={article.price}
                    onChange={(e) =>
                      handleUpdatePrice(article.id, parseFloat(e.target.value))
                    }
                    step="0.001"
                    min="0"
                  />
                </div>

                {article.status === "draft" && (
                  <button
                    className="btn btn-small btn-success"
                    onClick={() => handlePublish(article.id)}
                  >
                    Publish
                  </button>
                )}

                {article.status === "published" && (
                  <button
                    className="btn btn-small btn-warning"
                    onClick={() => handleArchive(article.id)}
                  >
                    Archive
                  </button>
                )}

                <button className="btn btn-small btn-danger">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
