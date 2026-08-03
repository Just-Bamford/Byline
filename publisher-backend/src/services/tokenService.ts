/**
 * Token verification service
 * Validates access tokens against Soroban contract state
 */

import { Keypair, StrKey } from "stellar-sdk";
import crypto from "crypto";

interface TokenCache {
  [key: string]: {
    valid: boolean;
    expiry: number;
  };
}

interface UsedNonce {
  nonce: string;
  usedAt: number;
}

const tokenCache: TokenCache = {};
const usedNonces: Map<string, number> = new Map();
const NONCE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Verify token with Soroban contract integration
 * Validates expiry, replay attacks, and signature
 */
export async function verifyToken(
  token: any,
  contractId: string,
): Promise<boolean> {
  try {
    // 1. Check cache first
    const cacheKey = `${token.reader}-${token.article_id}-${token.signature}`;
    if (tokenCache[cacheKey]) {
      const cached = tokenCache[cacheKey];
      if (cached.expiry > Date.now()) {
        return cached.valid;
      }
      delete tokenCache[cacheKey];
    }

    // 2. Check token expiry
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > token.expiry) {
      cacheToken(cacheKey, false, token.expiry);
      return false;
    }

    // 3. Check for replay attacks (nonce verification)
    if (await isTokenReplayed(token)) {
      cacheToken(cacheKey, false, token.expiry);
      return false;
    }

    // 4. Verify token signature
    if (!verifyTokenSignature(token)) {
      cacheToken(cacheKey, false, token.expiry);
      return false;
    }

    // 5. TODO: Query Stellar/Soroban contract for verification
    // const contractVerified = await verifyWithContract(token, contractId);
    // if (!contractVerified) return false;

    const isValid = true;
    cacheToken(cacheKey, isValid, token.expiry);

    return isValid;
  } catch (error) {
    console.error("Token verification error:", error);
    return false;
  }
}

/**
 * Verify token cryptographic signature using ed25519
 * Token signature must be created by the publisher using their secret key
 */
function verifyTokenSignature(token: any): boolean {
  try {
    if (
      !token.signature ||
      !token.reader ||
      !token.article_id ||
      !token.publisher
    ) {
      console.warn("Token missing required signature fields");
      return false;
    }

    // Reconstruct the message that was signed
    const message = constructTokenMessage(token);

    // Convert hex signature to buffer
    const signatureBuffer = Buffer.from(token.signature, "hex");

    // Verify signature using publisher's public key
    // In production, this uses the publisher's Stellar address (public key)
    const publisherPublicKey = token.publisher;

    // Stellar public keys are in StrKey format (starting with 'G')
    // Extract the raw public key bytes
    let publicKeyBytes: Buffer;
    try {
      publicKeyBytes = StrKey.decodeEd25519PublicKey(publisherPublicKey);
    } catch (err) {
      console.warn("Invalid publisher public key format:", publisherPublicKey);
      return false;
    }

    // Verify the Ed25519 signature
    const isValid = crypto.verify(
      "sha256",
      message,
      {
        key: Buffer.concat([
          Buffer.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70]), // Ed25519 OID
          Buffer.from([0x03, 0x21, 0x00]),
          publicKeyBytes,
        ]),
        format: "der",
      },
      signatureBuffer,
    );

    return isValid;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Construct the deterministic message that should have been signed
 */
function constructTokenMessage(token: any): Buffer {
  // Create a canonical message representation
  // Convert BigInt to string to avoid JSON.stringify errors
  const message = JSON.stringify({
    reader: token.reader,
    article_id: token.article_id,
    publisher: token.publisher,
    price:
      typeof token.price === "bigint" ? token.price.toString() : token.price,
    timestamp:
      typeof token.timestamp === "bigint"
        ? token.timestamp.toString()
        : token.timestamp,
    expiry:
      typeof token.expiry === "bigint" ? token.expiry.toString() : token.expiry,
    nonce:
      typeof token.nonce === "bigint" ? token.nonce.toString() : token.nonce,
  });

  return crypto.createHash("sha256").update(message).digest();
}

/**
 * Check if token has been replayed (nonce already used)
 */
export async function isTokenReplayed(token: any): Promise<boolean> {
  if (!token.nonce) {
    return true; // No nonce = potential replay
  }

  const nonceKey = `nonce:${token.nonce}`;
  const now = Date.now();

  // Check if nonce has been used
  if (usedNonces.has(nonceKey)) {
    console.warn("Replay attack detected: nonce already used");
    return true;
  }

  // Mark nonce as used with timestamp
  usedNonces.set(nonceKey, now);
  return false;
}

/**
 * Cache token verification result
 */
function cacheToken(key: string, valid: boolean, expiry: number): void {
  tokenCache[key] = {
    valid,
    expiry: expiry * 1000, // Convert to milliseconds
  };
}

/**
 * Clear expired tokens and old nonces from cache
 */
export function clearExpiredTokens(): void {
  const now = Date.now();

  // Clear expired token cache
  Object.keys(tokenCache).forEach((key) => {
    if (tokenCache[key].expiry < now) {
      delete tokenCache[key];
    }
  });

  // Clear old nonces (older than 24 hours)
  usedNonces.forEach((timestamp, nonceKey) => {
    if (now - timestamp > NONCE_TTL_MS) {
      usedNonces.delete(nonceKey);
    }
  });
}
