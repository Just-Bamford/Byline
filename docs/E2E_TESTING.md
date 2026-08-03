# End-to-End Testing Guide

This guide covers testing the complete Byline flow: reader wallet → article purchase → payment settlement → publisher analytics.

## Test Environment Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Stellar testnet account (free via Friendbot)

### Local Environment

Start the full stack:

```bash
docker compose up
```

This spins up:

- PostgreSQL database (localhost:5432)
- Publisher Backend API (localhost:3000)
- Reader Frontend (localhost:5173)

Wait for all services to be healthy before proceeding.

## Manual E2E Test Flow

### 1. Reader Registration & Wallet Setup

**Scenario**: Reader creates wallet and funds it

**Steps**:

1. Open `http://localhost:5173` (reader app)
2. Click "Create Wallet"
3. Choose "Email Login"
4. Enter test email: `test@example.com`
5. Note the generated wallet address
6. Click "Top Up Wallet"
7. Enter testnet XLM amount (e.g., 100 XLM)

**Expected Result**:

- Wallet address displayed
- Balance shows ~100 XLM
- No error messages

**Verification**:

```bash
curl http://localhost:3000/health
# Should return { "status": "ok", ... }
```

### 2. Article Discovery

**Scenario**: Reader browses available articles

**Steps**:

1. From reader app, view "Articles" tab
2. Verify articles are displayed with titles, prices
3. Click on an article to view details

**Expected Result**:

- Articles list loads
- Prices shown in stroops and XLM
- No 404 errors

**Verification**:

```bash
curl http://localhost:3000/articles/stats | jq '.articles | length'
# Should return > 0
```

### 3. Article Purchase & Payment

**Scenario**: Reader purchases and pays for article

**Steps**:

1. From article detail page, click "Purchase Article"
2. Confirm payment
3. Transaction submitted to contract
4. Receive access token

**Expected Result**:

- Payment deducted from wallet
- Token generated and stored
- Article content unlocked
- No contract errors

**Verification**:

```bash
# Check reader stats
READER_ADDRESS="GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON"
curl http://localhost:3000/readers/${READER_ADDRESS}/stats | jq '.'
# Should show: total_spent, articles_read, etc.
```

### 4. Token Verification

**Scenario**: Backend verifies token is valid

**Steps**:

1. Reader receives token after purchase
2. Backend verifies token signature
3. Backend checks token expiry
4. Backend checks for replay attacks

**Test via API**:

```bash
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": {
      "reader": "GBUQWP3...",
      "article_id": "article-1",
      "price": 1000,
      "timestamp": 1707000000,
      "expiry": 1707086400,
      "nonce": 123456,
      "signature": "abc123..."
    },
    "contractId": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4"
  }' | jq '.'
```

**Expected Result**:

```json
{
  "valid": true,
  "articleId": "article-1",
  "expiresAt": 1707086400,
  "timestamp": 1707000000
}
```

### 5. Read Event Recording

**Scenario**: Backend records article read for analytics

**Steps**:

1. After token verified, reader views article
2. Backend records read event
3. Analytics updated in database

**Test via API**:

```bash
curl -X POST http://localhost:3000/record-read \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "article-1",
    "readerId": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
    "publisherId": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
    "price": 1000,
    "duration": 300
  }' | jq '.'
```

**Expected Result**:

```json
{
  "success": true,
  "recordedAt": 1707000000,
  "articleId": "article-1",
  "readerId": "GBUQWP3..."
}
```

### 6. Publisher Analytics

**Scenario**: Publisher views earnings and analytics

**Steps**:

1. Query earnings endpoint
2. View article statistics
3. View top performing articles

**Test via API**:

```bash
# Get aggregate earnings
curl http://localhost:3000/earnings | jq '.'

# Get publisher-specific earnings
curl "http://localhost:3000/earnings?publisherAddress=GBUQWP3..." | jq '.'

# Get article stats
curl http://localhost:3000/articles/article-1/stats | jq '.'

# Get top articles
curl "http://localhost:3000/top-articles?limit=5" | jq '.'
```

**Expected Results**:

```json
{
  "total": 5000,
  "pending": 5000,
  "settled": 0,
  "read_count": 5,
  "unique_readers": 3,
  "currency": "XLM",
  "timestamp": 1707000000
}
```

## Automated E2E Testing (Optional)

### Using k6 for Load Testing

Create `loadtest.js`:

```javascript
import http from "k6/http";
import { check } from "k6";

export let options = {
  stages: [
    { duration: "1m", target: 10 }, // Ramp up
    { duration: "1m", target: 50 }, // Stay at 50
    { duration: "1m", target: 0 }, // Ramp down
  ],
};

export default function () {
  // Test verify endpoint
  let verifyRes = http.post(
    "http://localhost:3000/verify",
    JSON.stringify({
      token: {
        reader: "GBUQWP3...",
        article_id: "article-1",
        price: 1000,
        timestamp: Math.floor(Date.now() / 1000),
        expiry: Math.floor(Date.now() / 1000) + 86400,
        nonce: 123456,
        signature: "abc123",
      },
      contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  check(verifyRes, {
    "status is 200": (r) => r.status === 200,
    "body has valid key": (r) => r.body.indexOf("valid") !== -1,
  });

  // Test record-read endpoint
  let recordRes = http.post(
    "http://localhost:3000/record-read",
    JSON.stringify({
      articleId: "article-1",
      readerId: "GBUQWP3...",
      publisherId: "GBUQWP3...",
      price: 1000,
      duration: 300,
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  check(recordRes, {
    "status is 200": (r) => r.status === 200,
    "body has success": (r) => r.body.indexOf("success") !== -1,
  });
}
```

Run load test:

```bash
k6 run loadtest.js
```

## Debugging

### Check Logs

```bash
# Backend logs
docker compose logs publisher-backend

# Database logs
docker compose logs postgres

# Frontend logs (browser console)
# Open http://localhost:5173 and check browser DevTools → Console
```

### Database Inspection

```bash
# Connect to database
docker compose exec postgres psql -U byline_user -d byline

# View read events
SELECT * FROM read_events ORDER BY created_at DESC LIMIT 10;

# View article stats
SELECT
  a.id,
  COUNT(DISTINCT re.id) as read_count,
  SUM(re.price_paid) as total_revenue
FROM articles a
LEFT JOIN read_events re ON a.id = re.article_id
GROUP BY a.id;
```

### Token Verification Issues

If token verification fails:

1. **Check signature**: Ensure publisher's keypair matches token signature
2. **Check expiry**: Token must not be expired (check `expiry` timestamp)
3. **Check nonce**: Nonce must not have been used before (replay protection)
4. **Check format**: Stellar address must be valid (56 chars, starts with 'G')

## Test Checklist

- [ ] Reader can create wallet
- [ ] Reader can fund wallet
- [ ] Reader can view articles
- [ ] Reader can purchase article
- [ ] Token is generated after purchase
- [ ] Token verification succeeds
- [ ] Read event is recorded
- [ ] Analytics are updated
- [ ] Publisher can view earnings
- [ ] Publisher can view article stats
- [ ] No duplicate reads recorded
- [ ] Replay attacks are prevented
- [ ] Concurrent requests handled safely
- [ ] Error responses have request IDs
- [ ] Logs are structured (JSON format)

## Troubleshooting

### "Connection refused" on localhost:3000

```bash
# Check if backend is running
docker compose ps

# Check backend health
curl http://localhost:3000/health

# View logs
docker compose logs publisher-backend
```

### "Database connection failed"

```bash
# Check if PostgreSQL is running
docker compose exec postgres pg_isready

# Check connection string
echo $DATABASE_URL
```

### "Token verification failed"

1. Verify token structure matches expected format
2. Check token is not expired
3. Check publisher address matches token publisher field
4. Verify signature algorithm is ed25519

### "Payment failed"

1. Check reader has sufficient wallet balance
2. Verify contract ID is correct
3. Check network is testnet
4. Verify Stellar RPC endpoint is reachable

## Performance Targets

| Operation        | Target  | Notes                |
| ---------------- | ------- | -------------------- |
| Verify token     | < 100ms | Cached verification  |
| Record read      | < 200ms | Database write       |
| Get earnings     | < 500ms | Aggregation query    |
| Article purchase | 5s      | On-chain transaction |

## Next Steps

After passing E2E tests:

1. Deploy to staging environment
2. Run security audit
3. Load testing with realistic traffic
4. User acceptance testing
5. Production deployment
