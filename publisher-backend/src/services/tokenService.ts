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

export async function verifyToken(
  token: any,
  contractId: string,
): Promise<boolean> {
  // Check cache first
  const cacheKey = `${token.reader}-${token.article_id}-${token.signature}`;
  if (tokenCache[cacheKey]) {
    const cached = tokenCache[cacheKey];
    if (cached.expiry > Date.now()) {
      return cached.valid;
    }
    delete tokenCache[cacheKey];
  }

  // Check token expiry
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime > token.expiry) {
    cacheToken(cacheKey, false, token.expiry);
    return false;
  }

  // Check if token has been replayed
  if (await isTokenReplayed(token)) {
    cacheToken(cacheKey, false, token.expiry);
    return false;
  }

  // TODO: Query Stellar network for contract state
  // TODO: Verify token signature against contract

  // For now, assume valid if not expired and not replayed
  const isValid = true;
  cacheToken(cacheKey, isValid, token.expiry);

  return isValid;
}

export async function isTokenReplayed(token: any): Promise<boolean> {
  // TODO: Check if token has been used before
  // Store used tokens in database with expiry
  // For now, assume not replayed
  return false;
}

function cacheToken(key: string, valid: boolean, expiry: number): void {
  tokenCache[key] = {
    valid,
    expiry: expiry * 1000, // Convert to milliseconds
  };
}

export function clearExpiredTokens(): void {
  const now = Date.now();
  Object.keys(tokenCache).forEach((key) => {
    if (tokenCache[key].expiry < now) {
      delete tokenCache[key];
    }
  });
}
