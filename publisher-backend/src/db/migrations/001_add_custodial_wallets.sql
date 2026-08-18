-- Migration: Add Custodial Wallet Tables
-- Purpose: Support email-based managed wallets with magic link auth

-- Table: custodial_wallets
-- Stores user wallets derived from email
CREATE TABLE IF NOT EXISTS custodial_wallets (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  public_key TEXT UNIQUE NOT NULL,
  encrypted_secret_key TEXT NOT NULL,
  encryption_nonce TEXT NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'managed' CHECK (wallet_type IN ('managed', 'freighter')),
  has_exported BOOLEAN DEFAULT FALSE,
  exported_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL
);

-- Indexes for custodial_wallets
CREATE INDEX IF NOT EXISTS idx_custodial_email ON custodial_wallets(email);
CREATE INDEX IF NOT EXISTS idx_custodial_public_key ON custodial_wallets(public_key);
CREATE INDEX IF NOT EXISTS idx_custodial_created_at ON custodial_wallets(created_at DESC);

-- Table: auth_sessions
-- Tracks active user sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES custodial_wallets(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

-- Indexes for auth_sessions
CREATE INDEX IF NOT EXISTS idx_session_token ON auth_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_session_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expires_at ON auth_sessions(expires_at);

-- Table: login_tokens
-- Stores magic link and OTP tokens
CREATE TABLE IF NOT EXISTS login_tokens (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('magic_link', 'otp')),
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Indexes for login_tokens
CREATE INDEX IF NOT EXISTS idx_login_token_token ON login_tokens(token);
CREATE INDEX IF NOT EXISTS idx_login_token_email ON login_tokens(email);
CREATE INDEX IF NOT EXISTS idx_login_token_expires_at ON login_tokens(expires_at);

-- Table: audit_log (for security tracking)
-- Logs key operations for security auditing
CREATE TABLE IF NOT EXISTS wallet_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES custodial_wallets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit_log
CREATE INDEX IF NOT EXISTS idx_audit_user ON wallet_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON wallet_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON wallet_audit_log(created_at DESC);

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM login_tokens WHERE expires_at < NOW();
  DELETE FROM auth_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
