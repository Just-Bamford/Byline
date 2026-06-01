# Byline — Micropayment News Protocol

Pay per article. Not per month.

A decentralized micropayment protocol powered by Stellar (Soroban) that enables readers to pay fractions of a cent per article and publishers to receive instant, direct revenue.

## 🎯 Overview

Byline solves the news industry's monetization problem by enabling true pay-per-read economics:

- **Readers**: Pay only for articles you read. No subscriptions, no paywalls, no ads.
- **Publishers**: Receive instant settlement directly to your wallet. No intermediaries, no 30-day payment terms.
- **Journalists**: Get direct revenue share from every article read.

## 📁 Project Structure

```
byline/
├── contract/              # Soroban smart contract (Rust)
│   ├── Cargo.toml
│   └── src/lib.rs
├── reader-app/            # Reader frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── lib/           # Wallet & utilities
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── index.html
├── publisher-sdk/         # JavaScript SDK for publishers
│   ├── src/index.ts
│   ├── package.json
│   └── tsconfig.json
├── publisher-backend/     # Backend for token verification & analytics
│   ├── src/
│   │   ├── services/      # Token verification, analytics
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── docs/                  # Protocol & integration docs
│   ├── PROTOCOL.md
│   └── INTEGRATION.md
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust 1.70+ (for contract development)
- Stellar CLI tools

### 1. Deploy Soroban Contract

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

The reader app will start on `http://localhost:5173`

### 3. Run Publisher Backend

```bash
cd publisher-backend
npm install
npm run dev
```

The backend will start on `http://localhost:3000`

### 4. Integrate Publisher SDK

```bash
cd publisher-sdk
npm install
npm run build
```

## 🏗️ Architecture

### Reader Flow

1. **Wallet Creation**: Reader creates account via email (custodial wallet)
2. **Top-up**: Fund wallet with XLM or USDC
3. **Article Purchase**: Click article → Soroban contract deducts price → Token issued
4. **Access**: Token validated, article rendered

### Publisher Flow

1. **SDK Integration**: Add Byline SDK to your CMS/backend
2. **Token Verification**: Receive token from reader, verify via backend
3. **Content Delivery**: Serve article if token is valid
4. **Revenue Settlement**: Funds settle on-chain in real-time

### Smart Contract

The Soroban contract handles:

- **Article Registration**: Publishers register articles with pricing
- **Payment Processing**: Atomic payment + token issuance
- **Token Verification**: Validate tokens are not expired/replayed
- **Read Tracking**: Count reads per article

## 💰 Economics

- **Min article price**: $0.001
- **Stellar tx fee**: ~$0.000009
- **Protocol fee**: 0% (open source)
- **Settlement time**: ~5 seconds

## 🔐 Security

### Token Verification

- Single-use or time-bound tokens (24h expiry)
- Cryptographic signatures
- Replay attack prevention
- Rate limiting per reader/IP

### Access Control

- Reader authorization required for purchases
- Publisher authorization required for price changes
- Contract validates all signatures

## 📊 Analytics

The publisher backend provides:

- **Real-time earnings**: Total, pending, settled
- **Article performance**: Reads, revenue, avg price
- **Reader insights**: Total spent, articles read, avg price
- **Top articles**: Ranked by revenue

### API Endpoints

```bash
# Verify token
POST /verify
{ "token": {...}, "contractId": "..." }

# Record read
POST /record-read
{ "articleId": "...", "readerId": "...", "price": 0.002 }

# Get earnings
GET /earnings

# Article stats
GET /articles/:articleId/stats
GET /articles/stats

# Reader stats
GET /readers/:readerId/stats

# Top articles
GET /top-articles?limit=10

# Health check
GET /health
```

## 🛠️ Development

### Reader App

Built with React + TypeScript + Vite

```bash
cd reader-app
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run linter
```

### Publisher Backend

Built with Express + TypeScript

```bash
cd publisher-backend
npm run dev      # Start dev server
npm run build    # Build for production
```

### Publisher SDK

Built with TypeScript

```bash
cd publisher-sdk
npm run build    # Build for production
npm test         # Run tests
```

### Smart Contract

Built with Soroban SDK (Rust)

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
cargo test
```

## 📚 Documentation

- **[PROTOCOL.md](./docs/PROTOCOL.md)** - Technical protocol specification
- **[INTEGRATION.md](./docs/INTEGRATION.md)** - Integration guide for publishers

## 🚨 Known Limitations

### Current (MVP)

- Testnet only (not production-ready)
- In-memory analytics (no persistent database)
- Simplified token verification (no Stellar network queries)
- No fiat on-ramp integration
- No revenue sharing (100% to publisher)

### Roadmap

- [ ] Mainnet deployment
- [ ] PostgreSQL database integration
- [ ] Fiat on-ramp (Stripe, PayPal)
- [ ] Revenue sharing (writers, editors, co-publishers)
- [ ] Subscription tiers
- [ ] Cross-publisher analytics
- [ ] Recommendation engine
- [ ] Multi-chain support

## 🤝 Contributing

Byline is open source. Contributions welcome!

1. Fork the repo
2. Create a feature branch
3. Submit a pull request

## 📄 License

MIT

## 🙏 Acknowledgments

Built on [Stellar](https://stellar.org) and [Soroban](https://soroban.stellar.org).

---

**Questions?** Open an issue or check the [docs](./docs).
