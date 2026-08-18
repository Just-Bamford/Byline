/**
 * Custodial Wallet Service
 * Manages email-based managed wallets with server-side keypair derivation and storage
 */

import { Keypair, Networks } from "@stellar/stellar-sdk";
import crypto from "crypto";
import { query, queryOne } from "../db/client";
import { v4 as uuidv4 } from "uuid";

// Encryption key from environment
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.warn(
    "WARNING: WALLET_ENCRYPTION_KEY not set or invalid (must be 64 hex chars). Wallet encryption disabled.",
  );
}

export interface CustodialWallet {
  id: string;
  email: string;
  publicKey: string;
  walletType: "managed" | "freighter";
  hasExported: boolean;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface AuthSession {
  sessionToken: string;
  userId: string;
  expiresAt: Date;
}

/**
 * Derive a deterministic keypair from email (for consistency)
 * Uses PBKDF2 to stretch the email into a valid Stellar keypair seed
 */
export function deriveKeypairFromEmail(email: string): Keypair {
  const salt = Buffer.from("byline-custodial-wallet");

  // PBKDF2: derive 32 bytes from email
  const derivedSeed = crypto.pbkdf2Sync(email, salt, 100000, 32, "sha256");

  // Convert to Stellar keypair (seed must be 32 bytes)
  return Keypair.fromRawEd25519Seed(derivedSeed);
}

/**
 * Encrypt a secret key using AES-256-GCM
 */
export function encryptSecretKey(
  secretKey: string,
  encryptionKey: string,
): { encrypted: string; nonce: string } {
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error("Invalid encryption key");
  }

  const key = Buffer.from(encryptionKey, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(secretKey, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  const combined = iv.toString("hex") + authTag.toString("hex") + encrypted;

  return {
    encrypted: combined,
    nonce: iv.toString("hex"),
  };
}

/**
 * Decrypt a secret key using AES-256-GCM
 */
export function decryptSecretKey(
  encryptedData: string,
  encryptionKey: string,
): string {
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error("Invalid encryption key");
  }

  const key = Buffer.from(encryptionKey, "hex");

  // Parse the combined data (IV + authTag + encrypted)
  const iv = Buffer.from(encryptedData.slice(0, 32), "hex");
  const authTag = Buffer.from(encryptedData.slice(32, 64), "hex");
  const encrypted = encryptedData.slice(64);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Create or retrieve a custodial wallet for an email
 */
export async function getOrCreateWallet(
  email: string,
): Promise<CustodialWallet> {
  // Check if wallet exists
  const existing = await queryOne<CustodialWallet>(
    'SELECT id, email, public_key as "publicKey", wallet_type as "walletType", has_exported as "hasExported", created_at as "createdAt", last_login as "lastLogin" FROM custodial_wallets WHERE email = $1',
    [email],
  );

  if (existing) {
    return existing;
  }

  // Create new wallet
  const keypair = deriveKeypairFromEmail(email);
  const id = uuidv4();

  if (!ENCRYPTION_KEY) {
    throw new Error("Encryption key not configured");
  }

  const { encrypted: encryptedSecret, nonce } = encryptSecretKey(
    keypair.secret(),
    ENCRYPTION_KEY,
  );

  await query(
    `INSERT INTO custodial_wallets 
    (id, email, public_key, encrypted_secret_key, encryption_nonce, wallet_type, created_at) 
    VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [id, email, keypair.publicKey(), encryptedSecret, nonce, "managed"],
  );

  return {
    id,
    email,
    publicKey: keypair.publicKey(),
    walletType: "managed",
    hasExported: false,
    createdAt: new Date(),
    lastLogin: null,
  };
}

/**
 * Get wallet by email
 */
export async function getWalletByEmail(
  email: string,
): Promise<CustodialWallet | null> {
  return await queryOne<CustodialWallet>(
    'SELECT id, email, public_key as "publicKey", wallet_type as "walletType", has_exported as "hasExported", created_at as "createdAt", last_login as "lastLogin" FROM custodial_wallets WHERE email = $1',
    [email],
  );
}

/**
 * Get wallet by public key
 */
export async function getWalletByPublicKey(
  publicKey: string,
): Promise<CustodialWallet | null> {
  return await queryOne<CustodialWallet>(
    'SELECT id, email, public_key as "publicKey", wallet_type as "walletType", has_exported as "hasExported", created_at as "createdAt", last_login as "lastLogin" FROM custodial_wallets WHERE public_key = $1',
    [publicKey],
  );
}

/**
 * Get secret key for signing (decrypt from storage)
 */
export async function getSecretKeyForSigning(email: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error("Encryption key not configured");
  }

  const wallet = await queryOne<{
    encrypted_secret_key: string;
  }>("SELECT encrypted_secret_key FROM custodial_wallets WHERE email = $1", [
    email,
  ]);

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  return decryptSecretKey(wallet.encrypted_secret_key, ENCRYPTION_KEY);
}

/**
 * Create an authentication session
 */
export async function createSession(
  userId: string,
  durationHours: number = 24,
): Promise<AuthSession> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  await query(
    `INSERT INTO auth_sessions (id, user_id, session_token, expires_at, created_at) 
     VALUES ($1, $2, $3, $4, NOW())`,
    [uuidv4(), userId, token, expiresAt],
  );

  return {
    sessionToken: token,
    userId,
    expiresAt,
  };
}

/**
 * Verify a session token is valid
 */
export async function verifySessionToken(
  token: string,
): Promise<{ userId: string; email: string } | null> {
  const session = await queryOne<{
    user_id: string;
    email: string;
    expires_at: Date;
  }>(
    `SELECT s.user_id, w.email, s.expires_at 
     FROM auth_sessions s 
     JOIN custodial_wallets w ON s.user_id = w.id 
     WHERE s.session_token = $1`,
    [token],
  );

  if (!session) {
    return null;
  }

  // Check if expired
  if (new Date() > new Date(session.expires_at)) {
    return null;
  }

  return {
    userId: session.user_id,
    email: session.email,
  };
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateSession(token: string): Promise<void> {
  await query("DELETE FROM auth_sessions WHERE session_token = $1", [token]);
}

/**
 * Mark wallet as exported
 */
export async function markWalletExported(email: string): Promise<void> {
  await query(
    "UPDATE custodial_wallets SET has_exported = TRUE, exported_at = NOW() WHERE email = $1",
    [email],
  );
}

/**
 * Update last login time
 */
export async function updateLastLogin(email: string): Promise<void> {
  await query(
    "UPDATE custodial_wallets SET last_login = NOW() WHERE email = $1",
    [email],
  );
}

/**
 * Get wallet export data (shows secret key once)
 */
export async function getWalletExportData(email: string): Promise<{
  publicKey: string;
  secretKey: string;
} | null> {
  if (!ENCRYPTION_KEY) {
    throw new Error("Encryption key not configured");
  }

  const wallet = await queryOne<{
    public_key: string;
    encrypted_secret_key: string;
  }>(
    "SELECT public_key, encrypted_secret_key FROM custodial_wallets WHERE email = $1",
    [email],
  );

  if (!wallet) {
    return null;
  }

  const secretKey = decryptSecretKey(
    wallet.encrypted_secret_key,
    ENCRYPTION_KEY,
  );

  return {
    publicKey: wallet.public_key,
    secretKey,
  };
}
