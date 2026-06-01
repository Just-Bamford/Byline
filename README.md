<div align="center"><h1>Byline</h1><p><strong>Micropayment news protocol on Stellar Soroban.</strong><br/>Pay per article. Not per month. Readers fund journalism article by article. Publishers receive instant settlement. No intermediaries.</p><p><img src="https://img.shields.io/badge/network-Stellar%20Soroban-7C3AED?style=flat-square" alt="Stellar Soroban" /><img src="https://img.shields.io/badge/contract-Rust-CE422B?style=flat-square" alt="Rust" /><img src="https://img.shields.io/badge/frontend-React%2018-61DAFB?style=flat-square" alt="React" /><img src="https://img.shields.io/badge/backend-Express-000000?style=flat-square" alt="Express" /><img src="https://img.shields.io/badge/status-testnet-F59E0B?style=flat-square" alt="Testnet" /><img src="https://img.shields.io/badge/license-MIT-22C55E?style=flat-square" alt="MIT License" /></p></div>

---

## The Problem

The modern news industry is broken. Readers face subscription fatigue. Publishers depend on ads and data monetization. Journalists get squeezed. Paywalls are blunt instruments — all-or-nothing commitments that drive readers away. Micropayments have always been the theoretically correct answer. But every existing payment rail makes them economically absurd. A $0.002 read cannot survive a $0.30 processing fee.

## The Solution

Byline puts journalism on the Stellar blockchain. A reader funds a wallet and pays fractions of a cent per article — only for what they read. A publisher integrates the SDK and receives instant settlement directly to their wallet. No subscription churn. No ad surveillance. No intermediary taking a cut. Stellar's base fee of 0.00001 XLM makes per-article payments viable for the first time at real scale.

---

## How It Works

```
Reader                    Byline Contract              Publisher
│                              │                           │
├── fund wallet ──────────────▶│                           │
│                              │                           │
├── click article ─────────────▶│                           │
│                              │── deduct price            │
│                              │── issue token ────────────▶│
│                              │                           │
│                              │◀── verify token ──────────│
│                              │                           │
│◀── access granted ───────────│── serve content ──────────│
│                              │                           │
│                              │── settle revenue ─────────▶│
│                              │                           │
```

**No subscription. No paywall. No ads. Just payment for consumption.**

---

## Features

| Feature                    | Description                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| **Pay-per-read**           | Readers spend only what they consume. No recurring charge, no wasted subscription days.           |
| **Instant settlement**     | Payments settle on-chain directly to publisher wallets. No 30-day payment terms. No intermediary. |
| **Micropayment economics** | Stellar's sub-cent fees make $0.001–$0.003 article prices economically viable.                    |
| **Universal wallet**       | Single wallet works across all participating publishers. No account juggling.                     |
| **Token verification**     | Cryptographic proof of payment. Hospitals query instantly. No API keys shared.                    |
| **Usage-based analytics**  | On-chain reads are verifiable signals — real engagement, not ad impressions.                      |
| **Override protection**    | Readers control their wallet. Publishers set their own prices. No platform rent-seeking.          |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Byline                              │
│                                                             │
│  ┌───────────────┐    ┌───────────────┐    ┌─────────────┐ │
│  │  Reader App   │    │ Publisher API │    │  Soroban    │ │
│  │  (React)      │    │  (Express/TS) │    │  Contract   │ │
│  │               │    │               │    │  (Rust)     │ │
│  │  /wallet      │    │  GET /verify  │    │             │ │
│  │  /articles    │───▶│  POST /record │───▶│  register() │ │
│  │  /purchase    │    │  GET /earnings│    │  purchase() │ │
│  │               │    │               │    │  verify()   │ │
│  │  Stellar SDK  │    │  Horizon RPC  │    │  get_record │ │
│  │  Freighter    │    │               │    │             │ │
│  └───────────────┘    └───────────────┘    └─────────────┘ │
│                                                             │
│  Wallet: Non-custodial (Freighter) or custodial (email)   │
│  Storage: Soroban contract storage (Stellar ledger)       │
│  Network: Stellar Testnet / Mainnet                       │
│  Settlement: ~5 seconds                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
byline/
├── contract/                   # Soroban smart contract (Rust)
│   ├── src/
│   │   └── lib.rs              # Contract entry points
│   ├── Cargo.toml
│   └── README.md
├── reader-app/                 # React donor portal
│   ├── src/
│   │   ├── components/         # ArticleReader, WalletUI
│   │   ├── lib/                # WalletManager
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── README.md
├── publisher-backend/          # Express API
│   ├── src/
│   │   ├── services/           # Token verification, analytics
│   │   └── server.ts
│   ├── .env.example
│   └── README.md
├── publisher-sdk/              # JavaScript SDK
│   ├── src/
│   │   └── index.ts
│   └── package.json
├── docs/
│   ├── PROTOCOL.md             # Technical specification
│   ├── INTEGRATION.md          # Integration guide
│   └── PUBLISHER_EXAMPLE.md    # Code examples
├── QUICKSTART.md
└── README.md
```

---

## Contract Reference

The Byline Soroban contract exposes four public methods.

### `purchase_access`

Issues an access token when a reader pays for an article. Requires reader authorization.

```rust
fn purchase_access(
    env: Env,
    reader: Address,
    article_id: String,
) -> AccessToken
```

### `verify_token`

Returns `true` if a token is valid and not expired. Called by publisher backends.

```rust
fn verify_token(env: Env, reader: Address, article_id: String) -> bool
```

### `get_article_price`

Returns the current price for an article in stroops (1 XLM = 10,000,000 stroops).

```rust
fn get_article_price(env: Env, article_id: String) -> i128
```

### `set_article_price`

Updates article price. Requires publisher authorization.

```rust
fn set_article_price(
    env: Env,
    article_id: String,
    new_price: i128,
    publisher: Address,
)
```

---

## API Reference

The publisher backend wraps contract interaction in a REST interface.

### `POST /verify`

Verify an access token. Public endpoint.

**Request**

```json
{
  "token": {
    "reader": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
    "article_id": "article-1",
    "price": 0.002,
    "timestamp": 1717225200,
    "expiry": 1717311600,
    "signature": "abc123"
  },
  "contractId": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4"
}
```

**Response**

```json
{ "valid": true }
```

### `POST /record-read`

Record a successful article read for analytics.

```json
{
  "articleId": "article-1",
  "readerId": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
  "price": 0.002
}
```

### `GET /earnings`

Get total earnings (total, pending, settled).

### `GET /articles/:articleId/stats`

Get article performance (reads, revenue, avg price).

### `GET /readers/:readerId/stats`

Get reader spending (total spent, articles read, avg price).

### `GET /top-articles?limit=10`

Get top performing articles ranked by revenue.

### `GET /health`

Health check.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Rust 1.70+ (for contract)
- Stellar CLI (`soroban`)

### 1. Deploy the contract

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
soroban contract deploy --network testnet
```

Save the returned contract ID.

### 2. Run the backend

```bash
cd publisher-backend
cp .env.example .env
# Set CONTRACT_ID and STELLAR_RPC_URL in .env
npm install
npm run dev
```

API running at `http://localhost:3000`

### 3. Run the reader app

```bash
cd reader-app
npm install
npm run dev
```

Portal running at `http://localhost:5173`

### 4. Test the full flow

1. Open `http://localhost:5173`
2. Create wallet (Freighter or email)
3. Top up with testnet XLM
4. Click "Buy for $0.002" on any article
5. Read the article
6. Query `GET http://localhost:3000/earnings` to see analytics

For the complete deployment walkthrough, see [`QUICKSTART.md`](QUICKSTART.md).

---

## Privacy Model

Byline is designed so that no personally identifiable information ever reaches the blockchain.

1. Reader enters their email or connects Freighter wallet
2. Wallet address is used as the reader identifier
3. Only the wallet address and article ID are submitted to the contract
4. Publishers receive a token and can verify it — but cannot identify the reader
5. The contract stores no names, emails, or identifying strings

A publisher can confirm _that_ a reader paid, and _what_ they read — but cannot reverse-engineer _who_ the reader is.

---

## Roadmap

**Phase 1 — Testnet (current)**

- [x] Soroban contract: purchase, verify, pricing
- [x] Reader app: wallet, article browsing, purchasing
- [x] Publisher backend: token verification, analytics
- [x] Publisher SDK: drop-in integration
- [ ] Freighter wallet integration (in progress)
- [ ] Full Soroban RPC query wiring

**Phase 2 — Pilot**

- [ ] PostgreSQL database integration
- [ ] Fiat on-ramp (Stripe, PayPal)
- [ ] Publisher onboarding dashboard
- [ ] Contract security audit
- [ ] Testnet end-to-end testing with pilot publishers

**Phase 3 — Mainnet**

- [ ] Mainnet deployment
- [ ] 5-country pilot rollout
- [ ] Revenue sharing (writers, editors, co-publishers)
- [ ] Subscription tiers
- [ ] Mobile-optimized registration

---

## Why Stellar

Stellar's sub-cent transaction fees and 5-second finality make it uniquely viable for micropayment infrastructure. Soroban brings programmable payment logic without the complexity overhead of EVM chains. And Stellar's existing presence across African fintech ecosystems means the tooling, wallet infrastructure, and developer community are already there.

---

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for significant changes.

```bash
git clone https://github.com/Just-Bamford/Byline.git
cd byline
```

See [`docs/PROTOCOL.md`](docs/PROTOCOL.md) for a deeper understanding of the system before contributing.

---

## License

MIT © [Just-Bamford](https://github.com/Just-Bamford)

---

<div align="center"><sub>Built for the Stellar Wave Grants Program · Sustainable journalism infrastructure for Africa</sub></div>
