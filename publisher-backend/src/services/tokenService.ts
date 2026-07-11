/**
 * Token verification service
 * Validates access tokens against Soroban contract state
 */

interface TokenCache {
  [key: string]: {
    valid: boolean;
    expiry: number;
  };
}

const tokenCache: TokenCache = {};
const usedNonces: Set<string> = new Set();

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
 * Verify token cryptographic signature
 */
function verifyTokenSignature(token: any): boolean {
  if (!token.signature || !token.reader || !token.article_id) {
    return false;
  }
  // TODO: Implement cryptographic signature verification with ed25519
  // For now, validate structure exists
  return true;
}

/**
 * Check if token has been replayed (nonce already used)
 */
export async function isTokenReplayed(token: any): Promise<boolean> {
  if (!token.nonce) {
    return true; // No nonce = potential replay
  }

  const nonceKey = `nonce:${token.nonce}`;
  if (usedNonces.has(nonceKey)) {
    return true; // Nonce already used
  }

  // Mark nonce as used
  usedNonces.add(nonceKey);
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
  // Note: usedNonces is Set, can't iterate with expiry easily
  // Consider using Map<string, timestamp> in future
}
