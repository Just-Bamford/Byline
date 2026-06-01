# Byline Integration Guide

## Publisher Integration (JavaScript)

### 1. Install SDK

```bash
npm install @byline/publisher-sdk
```

### 2. Initialize

```javascript
import BylinePublisher from "@byline/publisher-sdk";

const byline = new BylinePublisher({
  contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
  verificationServiceUrl: "https://api.byline.example.com",
  publisherAddress: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
});
```

### 3. Verify Token

```javascript
// When reader tries to access article
const token = req.body.token;

const isValid = await byline.verifyToken(token);

if (isValid) {
  // Serve article content
  res.json({ content: articleContent });
} else {
  // Deny access
  res.status(403).json({ error: "Invalid or expired token" });
}
```

### 4. Set Article Price

```javascript
await byline.setArticlePrice("article-123", 0.002); // $0.002
```

### 5. Get Earnings

```javascript
const earnings = await byline.getEarnings();
console.log(`Total: $${earnings.total}`);
console.log(`Pending: $${earnings.pending}`);
console.log(`Settled: $${earnings.settled}`);
```

## Reader Integration (React)

### 1. Install Dependencies

```bash
npm install stellar-sdk axios
```

### 2. Create Wallet

```javascript
import { WalletManager } from "@byline/reader-app";

const wallet = new WalletManager();
const publicKey = wallet.getPublicKey();
```

### 3. Purchase Article

```javascript
const token = await wallet.purchaseArticle(
  contractId,
  "article-123",
  0.002, // price in USD
  publisherAddress,
);

// Send token to publisher
const response = await axios.post("/api/article", { token });
```

### 4. Top Up Wallet

```javascript
await wallet.topUp(10); // Top up $10
```

## Backend Setup

### 1. Deploy Publisher Backend

```bash
cd publisher-backend
npm install
npm run build
npm start
```

### 2. Environment Variables

```env
PORT=3000
STELLAR_NETWORK=testnet
CONTRACT_ID=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4
DATABASE_URL=postgresql://...
```

### 3. Verify Tokens

The backend exposes a `/verify` endpoint:

```bash
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": { ... },
    "contractId": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4"
  }'
```

## Testing

### 1. Deploy Contract to Testnet

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
soroban contract deploy --network testnet
```

### 2. Run Reader App

```bash
cd reader-app
npm install
npm run dev
```

### 3. Run Publisher Backend

```bash
cd publisher-backend
npm install
npm run dev
```

### 4. Test Payment Flow

1. Create reader wallet
2. Top up with testnet XLM
3. Click article
4. Verify token on backend
5. Check earnings

## Deployment Checklist

- [ ] Contract audited by third party
- [ ] Reader app tested on mainnet
- [ ] Publisher SDK tested with real publishers
- [ ] Backend rate limiting configured
- [ ] Database backups enabled
- [ ] Monitoring and alerting set up
- [ ] Fiat off-ramp integrated
- [ ] Legal review completed
