# Byline Release Notes

---

## v0.1.0 (August 4, 2026) - MVP Release

### 🎉 Features Complete

**Smart Contract (Soroban/Rust)**

- ✅ `register_article()` - Register articles with price
- ✅ `purchase_access()` - Purchase 24-hour access tokens
- ✅ `verify_token()` - Verify access on-chain
- ✅ `get_article_price()` - Fetch article pricing
- ✅ `set_article_price()` - Adjust pricing
- ✅ `get_total_reads()` - Get global read counter
- ✅ Analytics functions for publisher earnings

**Reader App (React/TypeScript)**

- ✅ Freighter wallet integration & connection
- ✅ Article browsing with dynamic pricing
- ✅ One-click article purchase with Freighter signing
- ✅ Testnet XLM wallet funding (Friendbot)
- ✅ Article reading with token verification
- ✅ Professional article typography & layout
- ✅ Real-time balance updates
- ✅ Transaction status & TX hash display
- ✅ Sample articles with full editorial content
- ✅ ESLint linting & TypeScript strict mode

**Publisher Backend (Express/TypeScript)**

- ✅ Soroban RPC integration for contract calls
- ✅ `/verify` - Token verification endpoint
- ✅ `/record-read` - Analytics recording
- ✅ `/earnings` - Publisher earnings API
- ✅ `/articles/:id/stats` - Article performance
- ✅ `/readers/:id/stats` - Reader analytics
- ✅ `/top-articles` - Leaderboard endpoint
- ✅ `/health` - Contract health check
- ✅ PostgreSQL persistence for analytics
- ✅ Structured JSON logging
- ✅ Error handling & validation

**Publisher SDK (TypeScript Library)**

- ✅ `BylineSDK` class with contract interaction
- ✅ `verify()` - Query contract for access
- ✅ `getPrice()` - Fetch article pricing
- ✅ `getTotalReads()` - Get analytics
- ✅ `getContractInfo()` - Return metadata
- ✅ Unit conversion helpers (stroops ↔ XLM)
- ✅ TypeScript strict mode compliance

**Infrastructure & DevOps**

- ✅ Docker containerization (backend, frontend)
- ✅ Docker Compose orchestration
- ✅ GitHub Actions CI/CD pipelines
- ✅ Automated testing on every commit
- ✅ TypeScript compilation checks
- ✅ ESLint code quality
- ✅ Contract unit tests (4/4 passing)
- ✅ Integration tests (PostgreSQL + Soroban)

**Documentation**

- ✅ README with architecture overview
- ✅ DEMO.md - Interactive 5-minute walkthrough
- ✅ TESTNET.md - Deployment guide
- ✅ DEPLOYMENT.md - Production deployment (Vercel, Railway, Docker)
- ✅ INTEGRATION.md - Publisher integration guide
- ✅ PROTOCOL.md - Technical specification
- ✅ API reference documentation
- ✅ E2E testing guide
- ✅ Environment setup guide

### 🔧 Technical Details

**Testnet Status**

- Contract built to WASM ✅
- Ready for Stellar testnet deployment
- Soroban RPC: https://soroban-testnet.stellar.org
- No production mainnet deployment yet

**Build & Test Results**

- Backend: `npm run build` ✅
- Reader App: `npm run build` ✅
- SDK: `npm run build` ✅
- Linting: `npm run lint` ✅
- Contract tests: `cargo test` 4/4 ✅
- CI/CD: All workflows passing ✅

**Dependencies**

- @stellar/stellar-sdk: ^12.0.0
- @stellar/freighter-api: ^2.0.0
- React: ^18.2.0
- Express: ^4.18.0
- Soroban SDK: 21.0.0
- PostgreSQL: 14+

### 📊 Project Metrics

| Metric              | Value                     |
| ------------------- | ------------------------- |
| Commits             | 11                        |
| Files Changed       | 47                        |
| Lines of Code       | ~8,500                    |
| Contract Tests      | 4/4 passing               |
| Backend Tests       | Integration tests passing |
| Frontend Components | 5 major                   |
| API Endpoints       | 8 public                  |
| Documentation Pages | 10 comprehensive          |

### 🚀 Next Phase (Phase 2 - Testnet)

- [ ] Deploy contract to Stellar testnet
- [ ] Obtain real contract ID
- [ ] Deploy backend to Railway or Render
- [ ] Deploy frontend to Vercel
- [ ] Record & publish demo GIF
- [ ] Update TESTNET.md with real contract ID & tx hashes
- [ ] End-to-end testing with real on-chain transactions
- [ ] Monitoring & alerting setup
- [ ] Public testnet announcement

### 📝 Known Limitations

- Testnet only (no mainnet deployment)
- No writer revenue splits yet (coming Phase 3)
- No fiat on-ramp (coming Phase 3)
- Contract audit not yet performed
- Limited to Freighter wallet (Albedo support planned)

### 🙏 Acknowledgments

Built for the **Stellar Wave Grants Program** with focus on sustainable journalism infrastructure for Africa.

Technologies: Soroban, Stellar, React, TypeScript, Docker

---

## v0.0.1 (July 20, 2026) - Initial Development

**Initial commit** - Project scaffolding, contract foundation, backend setup, reader app skeleton.

---

## Roadmap

### Phase 1 ✅ (Complete)

- MVP development
- Local testing
- CI/CD setup

### Phase 2 🔄 (In Progress)

- Testnet deployment
- Live hosting (Vercel + Railway)
- Demo video
- Security basics

### Phase 3 📋 (Planned)

- Writer revenue splits
- Fiat on-ramps
- Publisher dashboard
- Security audit
- Mainnet preparation

### Phase 4 🎯 (Future)

- Mobile apps (iOS/Android)
- Additional wallets
- Subscription tiers
- Global expansion

---

For detailed feature descriptions, see [README.md](../README.md).

For development updates and discussions, see [GitHub Discussions](https://github.com/Just-Bamford/Byline/discussions).

Last Updated: August 4, 2026
