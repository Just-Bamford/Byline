-- Byline Analytics Database Schema
-- PostgreSQL 12+

CREATE TABLE IF NOT EXISTS articles (
  id VARCHAR(256) PRIMARY KEY,
  publisher_address VARCHAR(56) NOT NULL,
  title VARCHAR(500),
  category VARCHAR(100),
  price BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS read_events (
  id SERIAL PRIMARY KEY,
  article_id VARCHAR(256) NOT NULL REFERENCES articles(id),
  reader_address VARCHAR(56) NOT NULL,
  publisher_address VARCHAR(56) NOT NULL,
  price_paid BIGINT NOT NULL,
  duration_seconds INTEGER,
  timestamp BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS access_tokens (
  id SERIAL PRIMARY KEY,
  reader_address VARCHAR(56) NOT NULL,
  article_id VARCHAR(256) NOT NULL,
  publisher_address VARCHAR(56) NOT NULL,
  nonce BIGINT NOT NULL UNIQUE,
  price_stroops BIGINT NOT NULL,
  issued_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at BIGINT,
  signature VARCHAR(256),
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS publisher_earnings (
  id SERIAL PRIMARY KEY,
  publisher_address VARCHAR(56) NOT NULL UNIQUE,
  total_earned BIGINT NOT NULL DEFAULT 0,
  pending_settlement BIGINT NOT NULL DEFAULT 0,
  settled_amount BIGINT NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  unique_readers INTEGER NOT NULL DEFAULT 0,
  last_settlement_at BIGINT,
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS reader_stats (
  id SERIAL PRIMARY KEY,
  reader_address VARCHAR(56) NOT NULL UNIQUE,
  total_spent BIGINT NOT NULL DEFAULT 0,
  articles_read INTEGER NOT NULL DEFAULT 0,
  first_read_at BIGINT,
  last_read_at BIGINT,
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- Indexes for query performance
CREATE INDEX idx_read_events_article_id ON read_events(article_id);
CREATE INDEX idx_read_events_reader_address ON read_events(reader_address);
CREATE INDEX idx_read_events_publisher_address ON read_events(publisher_address);
CREATE INDEX idx_read_events_timestamp ON read_events(timestamp DESC);
CREATE INDEX idx_access_tokens_reader ON access_tokens(reader_address);
CREATE INDEX idx_access_tokens_article ON access_tokens(article_id);
CREATE INDEX idx_access_tokens_nonce ON access_tokens(nonce);
CREATE INDEX idx_access_tokens_expiry ON access_tokens(expires_at);
CREATE INDEX idx_articles_publisher ON articles(publisher_address);
CREATE INDEX idx_articles_created ON articles(created_at DESC);
