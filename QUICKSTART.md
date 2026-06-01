# Byline Quick Start Guide

Get Byline running locally in 5 minutes.

## Prerequisites

- Node.js 18+
- Rust 1.70+ (for contract)
- Git

## 1. Clone & Setup

```bash
# Navigate to project
cd byline

# Install dependencies for all packages
npm install --workspaces
```

## 2. Start Reader App

```bash
cd reader-app
npm run dev
```

Opens at `http://localhost:5173`

### What to do:

1. Click "Create Wallet"
2. Enter any email
3. Wait for wallet to fund (Friendbot)
4. See balance update
5. Click "Buy for $0.002" on any article
6. Read the article

## 3. Start Publisher Backend

In a new terminal:

```bash
cd publisher-backend
npm run dev
```

Runs on `http://localhost:3000`

### Test endpoints:

```bash
# Check health
curl http://localhost:3000/health

# Get earnings
curl http://localhost:3000/earnings

# Get top articles
curl http://localhost:3000/top-articles
```

## 4. Test Token Verification

```bash
# Verify a token
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": {
      "reader": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
      "article_id": "article-1",
      "price": 0.002,
      "timestamp": 1717225200,
      "expiry": 1717311600,
      "signature": "abc123"
    },
    "contractId": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4"
  }'
```

## 5. Test Analytics

```bash
# Record a read
curl -X POST http://localhost:3000/record-read \
  -H "Content-Type: application/json" \
  -d '{
    "articleId": "article-1",
    "readerId": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
    "price": 0.002
  }'

# Get article stats
curl http://localhost:3000/articles/article-1/stats

# Get reader stats
curl http://localhost:3000/readers/GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON/stats
```

## 6. Build Publisher SDK

```bash
cd publisher-sdk
npm run build
```

Outputs to `dist/`

## 7. Deploy Contract (Optional)

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
soroban contract deploy --network testnet
```

## Common Issues

### "Account not found on network"

- Wallet needs to be funded
- Use Friendbot: `https://friendbot.stellar.org?addr=YOUR_ADDRESS`

### "Failed to fetch balance"

- Check Stellar network is accessible
- Verify testnet is selected

### "Token verification failed"

- Check token hasn't expired
- Verify contractId matches

### Port already in use

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Next Steps

1. **Read the docs**: Check `docs/PROTOCOL.md` and `docs/INTEGRATION.md`
2. **Integrate SDK**: See `docs/PUBLISHER_EXAMPLE.md`
3. **Deploy**: Follow deployment guide in `README.md`
4. **Add database**: Replace in-memory analytics with PostgreSQL

## Architecture Overview

```
Reader App (React)
    ↓
Stellar Network
    ↓
Soroban Contract
    ↓
Publisher Backend (Express)
    ↓
Analytics Service
```

## File Locations

- **Reader App**: `reader-app/src/`
- **Backend**: `publisher-backend/src/`
- **SDK**: `publisher-sdk/src/`
- **Contract**: `contract/src/`
- **Docs**: `docs/`

## Useful Commands

```bash
# Start everything
npm run dev:all

# Build everything
npm run build:all

# Test contract
cd contract && cargo test

# Lint reader app
cd reader-app && npm run lint

# Format code
npm run format
```

## API Reference

### Reader App

- `WalletManager.create()` - Create new wallet
- `WalletManager.fromSecret(secret)` - Load wallet
- `wallet.getBalance()` - Get XLM balance
- `wallet.purchaseArticle(contractId, articleId, price, publisher)` - Buy article
- `wallet.topUp(amount)` - Fund wallet

### Backend

- `POST /verify` - Verify token
- `POST /record-read` - Record read
- `GET /earnings` - Get earnings
- `GET /articles/:id/stats` - Article stats
- `GET /readers/:id/stats` - Reader stats
- `GET /top-articles` - Top articles
- `GET /health` - Health check

### SDK

- `BylinePublisher.verifyToken(token)` - Verify token
- `BylinePublisher.setArticlePrice(articleId, price)` - Set price
- `BylinePublisher.getArticlePrice(articleId)` - Get price
- `BylinePublisher.getEarnings()` - Get earnings

## Support

- **Docs**: See `docs/` folder
- **Issues**: Check `IMPLEMENTATION_SUMMARY.md`
- **Examples**: See `docs/PUBLISHER_EXAMPLE.md`

---

**Ready to build?** Start with the reader app and backend, then integrate the SDK into your publication.
