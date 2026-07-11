# Byline Integration Guide

Complete guide for integrating the Byline payment protocol across services.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Reader App                              │
│  - Article Discovery  - Wallet Management  - Purchase Flow      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (HTTPS REST)
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Publisher Backend                            │
│  - Token Verification  - Analytics Recording  - Earnings Calc   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (Contract Calls)
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Soroban Smart Contract                         │
│  - Article Registration  - Access Tokens  - Read Tracking       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ (RPC)
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Stellar Testnet/Production                    │
│         - Payment Settlement  - On-chain Analytics              │
└─────────────────────────────────────────────────────────────────┘
```

## API Reference

### Publisher Backend APIs

#### 1. Token Verification Endpoint

**POST** `/api/verify`

Verifies access token and grants article access.

**Request Headers:**

```
X-API-Key: your-api-key
Content-Type: application/json
```

**Request Body:**

```json
{
  "token": {
    "reader": "GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O",
    "article_id": "article-123",
    "publisher": "GBUQWP3BOUZX34ULNQG23RQ6F4BVDERBSUM2QYU5WRAPPER5OINANIBJLQ",
    "price": 200000,
    "timestamp": 1705100000,
    "expiry": 1705186400,
    "nonce": 1234567890
  },
  "contractId": "CBQY47FRHGBRAJPQZRUOXVO6BJ2QQ4WIMK6BLRESQ3SRXMX5NRINMWT"
}
```

**Response (Success):**

```json
{
  "success": true,
  "verified": true,
  "articleId": "article-123",
  "expiresAt": 1705186400
}
```

**Response (Failure):**

```json
{
  "success": false,
  "error": "Token expired",
  "code": "TOKEN_EXPIRED"
}
```

**Error Codes:**

- `MISSING_API_KEY` - API key not provided
- `INVALID_API_KEY` - API key invalid
- `TOKEN_EXPIRED` - Token past expiry time
- `TOKEN_REPLAYED` - Token already used (nonce conflict)
- `INVALID_SIGNATURE` - Token signature verification failed
- `RATE_LIMITED` - Too many requests

#### 2. Record Read Endpoint

**POST** `/api/record-read`

Records article read event for analytics and earnings tracking.

**Request Headers:**

```
X-API-Key: your-api-key
Content-Type: application/json
```

**Request Body:**

```json
{
  "articleId": "article-123",
  "readerId": "GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O",
  "price": 0.002,
  "duration": 300,
  "token": {
    "reader": "GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O",
    "article_id": "article-123",
    "nonce": 1234567890,
    "expiry": 1705186400
  }
}
```

**Response (Success):**

```json
{
  "success": true,
  "recordedAt": 1705100000,
  "articleId": "article-123",
  "readerId": "GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O"
}
```

#### 3. Get Earnings Endpoint

**GET** `/api/earnings?publisher=GBUQWP3...`

Retrieves publisher earnings and statistics.

**Request Headers:**

```
X-API-Key: your-api-key
```

**Response:**

```json
{
  "publisher": "GBUQWP3BOUZX34ULNQG23RQ6F4BVDERBSUM2QYU5WRAPPER5OINANIBJLQ",
  "totalEarnings": 12.5,
  "currency": "XLM",
  "articles": [
    {
      "articleId": "article-123",
      "title": "Introduction to Stellar",
      "reads": 45,
      "earnings": 9.0,
      "lastRead": 1705100000
    }
  ],
  "period": {
    "start": 1705000000,
    "end": 1705100000
  }
}
```

#### 4. Get Analytics Endpoint

**GET** `/api/analytics/article/{articleId}`

Retrieves detailed analytics for an article.

**Response:**

```json
{
  "articleId": "article-123",
  "title": "Introduction to Stellar",
  "publisher": "GBUQWP3...",
  "price": 0.002,
  "stats": {
    "totalReads": 45,
    "uniqueReaders": 38,
    "totalRevenue": 9.0,
    "avgReadDuration": 425,
    "publishedAt": 1704000000
  },
  "recentReads": [
    {
      "readerId": "GBQCEJBGX5...",
      "timestamp": 1705100000,
      "duration": 300
    }
  ]
}
```

## SDK Integration

### Installation

```bash
npm install @byline/publisher-sdk
```

### Initialization

```typescript
import { BylineSDK } from "@byline/publisher-sdk";

const sdk = new BylineSDK({
  backendUrl: "https://api.byline.local",
  contractId: "CBQY47FRHGBRAJPQZRUOXVO6BJ2QQ4WIMK6BLRESQ3SRXMX5NRINMWT",
  apiKey: process.env.BYLINE_API_KEY,
});
```

### Register Article

```typescript
await sdk.registerArticle({
  articleId: "article-123",
  title: "Introduction to Stellar",
  category: "technology",
  price: 0.002,
});
```

### Verify Access Token

```typescript
const isValid = await sdk.verifyToken(readerId, articleId, token);

if (isValid) {
  // Grant access to article
  res.json({ content: articleContent });
} else {
  // Deny access
  res.status(403).json({ error: "Invalid token" });
}
```

### Record Read

```typescript
await sdk.recordRead({
  articleId: "article-123",
  readerId: "GBQCEJBGX5...",
  duration: 300,
  token: accessToken,
});
```

### Get Earnings

```typescript
const earnings = await sdk.getEarnings(publisherAddress);
console.log(`Total earnings: ${earnings.totalEarnings} XLM`);
```

## Reader App Integration

### Purchase Flow

```typescript
// 1. User clicks "Buy Article"
const article = await getArticleMetadata(articleId);

// 2. Show confirmation dialog
showPurchaseDialog({
  title: article.title,
  price: article.price,
  publisher: article.publisherName,
});

// 3. User confirms and signs transaction
const transaction = await wallet.signTransaction({
  type: "payment",
  destination: publisherAddress,
  amount: article.price,
  asset: "native",
});

// 4. Submit to contract
const token = await contract.purchaseAccess(
  readerAddress,
  articleId,
  publisherAddress,
);

// 5. Store token locally
localStorage.setItem(`token:${articleId}`, JSON.stringify(token));

// 6. Display article
displayArticle(article, token);
```

### Read Tracking

```typescript
// Track read time
const readStart = Date.now();
let scrollDepth = 0;

window.addEventListener("scroll", () => {
  scrollDepth = calculateScrollDepth();
});

window.addEventListener("beforeunload", async () => {
  const duration = Math.round((Date.now() - readStart) / 1000);

  // Send read event to backend
  await fetch("/api/record-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      articleId,
      readerId,
      duration,
      scrollDepth,
      token: getStoredToken(articleId),
    }),
  });
});
```

## Security Considerations

### API Security

1. **API Key Validation**
   - All API requests require valid X-API-Key header
   - Store keys in environment variables only
   - Rotate keys regularly

2. **Rate Limiting**
   - 100 requests per minute per API key
   - 429 Too Many Requests response when exceeded
   - Automatic cleanup of rate limit counters

3. **Request Validation**
   - All payloads validated against schema
   - Maximum payload size: 100KB
   - Invalid requests return 400 Bad Request

### Token Security

1. **Token Signature**
   - Tokens signed with contract key
   - Signature verified server-side
   - Tampered tokens rejected

2. **Token Expiry**
   - Tokens valid for 24 hours only
   - Expired tokens rejected with 403
   - Nonce prevents replay attacks

3. **Storage**
   - Tokens stored in browser localStorage
   - Sandboxed to domain origin
   - HTTPS-only in production

## Deployment Checklist

Before deploying to production:

### Contract Setup

- [ ] Contract deployed to Stellar network
- [ ] Contract ID configured in backend
- [ ] Contract verified on blockchain
- [ ] Emergency pause mechanism tested

### Backend Setup

- [ ] Environment variables configured
- [ ] API keys generated and stored securely
- [ ] Database migrations run
- [ ] Backups configured
- [ ] Monitoring and logging enabled
- [ ] Rate limiting configured
- [ ] CORS properly restricted

### Frontend Setup

- [ ] Reader app pointing to production backend
- [ ] Wallet SDK configured for production
- [ ] Analytics tracking verified
- [ ] Error handling tested
- [ ] Network requests over HTTPS

### Security Review

- [ ] Contract audit completed
- [ ] Backend security review done
- [ ] Frontend dependencies audited
- [ ] Secrets management reviewed
- [ ] Incident response plan ready

### Load Testing

- [ ] 1000+ concurrent users tested
- [ ] 10,000+ daily transactions capacity verified
- [ ] Database performance acceptable
- [ ] Contract execution times < 1 second
- [ ] Backend API response times < 500ms

### Monitoring Setup

- [ ] Error tracking configured (Sentry, etc.)
- [ ] Performance monitoring active
- [ ] Payment success rate dashboard
- [ ] Contract event parsing working
- [ ] Alert thresholds set:
  - Purchase success rate < 95%
  - Token validation failure > 5%
  - Backend latency > 1 second
  - Contract errors

### Documentation

- [ ] API documentation live
- [ ] Integration examples updated
- [ ] Deployment runbook created
- [ ] Troubleshooting guide written
- [ ] Support team trained

## Monitoring and Observability

### Key Metrics

```typescript
// Purchase metrics
metrics.histogram("purchase.duration", duration);
metrics.gauge("purchase.success_rate", successRate);
metrics.counter("purchase.failures", 1, { reason: "insufficient_balance" });

// Token verification metrics
metrics.histogram("token.verify.duration", duration);
metrics.counter("token.verify.failures", 1, { reason: "expired" });
metrics.gauge("token.cache.hit_rate", hitRate);

// Earnings metrics
metrics.gauge("earnings.total", totalEarnings);
metrics.counter("earnings.recorded", 1, { articleId });
metrics.gauge("earnings.by_article", earnings, { articleId });
```

### Logging

```typescript
// Successful operations
logger.info("article_purchased", {
  articleId,
  readerId,
  price,
  timestamp,
  transactionHash,
});

// Errors
logger.error("purchase_failed", {
  articleId,
  readerId,
  reason: "insufficient_balance",
  error: e.message,
});
```

## Troubleshooting

### Token Verification Fails

**Problem:** Tokens consistently rejected

**Solutions:**

1. Check contract ID matches deployment
2. Verify timestamp synchronization between services
3. Confirm API key permissions
4. Check rate limiting not exceeded
5. Inspect token signature in logs

### Payment Processing Slow

**Problem:** Transactions taking > 5 seconds

**Solutions:**

1. Check Stellar network status
2. Verify contract gas limits
3. Increase timeout values
4. Check network connectivity
5. Monitor database query performance

### Missing Analytics

**Problem:** Read events not recorded

**Solutions:**

1. Verify /record-read endpoint responsive
2. Check read events table for data
3. Confirm token validation passing
4. Review backend logs for errors
5. Verify database connection

## Contact & Support

For integration assistance:

- Email: support@byline.local
- Docs: https://docs.byline.local
- Issues: https://github.com/byline/byline
