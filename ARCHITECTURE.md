# Byline System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    READER APP (React)                   │
│            Browser-based wallet & article reader        │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     ↓
┌─────────────────────────────────────────────────────────┐
│              PUBLISHER BACKEND (Express)                │
│  • Token verification                                   │
│  • Analytics & earnings tracking                        │
│  • Rate limiting & caching                              │
└────────────────────┬────────────────────────────────────┘
                     │ JSON-RPC
                     ↓
┌─────────────────────────────────────────────────────────┐
│         STELLAR SOROBAN (Smart Contract)                │
│  • Access token issuance                                │
│  • Token verification                                   │
│  • Publisher authorization                              │
│  • Payment escrow                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           PUBLISHER SDK (TypeScript/NPM)                │
│  Drop-in integration for any publisher backend          │
└─────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Smart Contract (Stellar Soroban)

**Language**: Rust + Soroban SDK
**Network**: Stellar (testnet/mainnet)
**Finality**: ~5 seconds

**Responsibilities**:

- Register articles with pricing
- Issue access tokens to readers
- Verify token validity
- Track read events
- Manage publisher authorization

**Key Functions**:

```rust
// Initialize contract with admin
pub fn init(env: Env, admin: Address)

// Register article with price
pub fn register_article(
  env: Env,
  publisher: Address,
  article_id: String,
  price_stroops: i128
)

// Issue token for article access
pub fn issue_token(
  env: Env,
  article_id: String,
  reader: Address,
  publisher: Address
) -> Token

// Verify token validity
pub fn verify_token(
  env: Env,
  token: Token
) -> TokenStatus

// Record article read
pub fn record_read(
  env: Env,
  article_id: String,
  reader: Address
)
```

### 2. Reader App (React)

**Language**: TypeScript + React
**Bundler**: Vite
**Runtime**: Browser

**Responsibilities**:

- User wallet management
- Article browsing & discovery
- Purchase workflow (1-click)
- Balance management
- Token storage & validation

**Key Components**:

- `WalletUI`: Wallet creation, funding, balance display
- `ArticleReader`: Article display with purchase option
- `wallet.ts`: Wallet manager (Stellar SDK integration)

**Data Flow**:

```
User Input
    ↓
React Component
    ↓
Wallet Manager
    ↓
Stellar SDK
    ↓
Smart Contract
    ↓
Token Issued → Stored in localStorage → Article Unlocked
```

### 3. Publisher Backend (Express)

**Language**: TypeScript + Express.js
**Runtime**: Node.js 18+
**Port**: 3000 (default)

**Responsibilities**:

- Verify access tokens
- Track article reads
- Calculate earnings
- Provide analytics API
- Rate limiting

**Key Services**:

- `tokenService.ts`: Token verification & validation
- `analyticsService.ts`: Earnings & read tracking

**API Endpoints**:

```
POST   /verify              Verify token validity
POST   /record-read         Record article read event
GET    /earnings            Get total earnings
GET    /articles/:id/stats  Get stats for article
GET    /articles/stats      Get all article stats
GET    /readers/:id/stats   Get reader statistics
GET    /top-articles        Get top performing articles
GET    /health              Health check
```

### 4. Publisher SDK (TypeScript)

**Language**: TypeScript
**Distribution**: NPM (@byline/publisher-sdk)
**Platform**: Node.js compatible

**Responsibilities**:

- Drop-in verification
- Event tracking
- Earnings management
- Publisher onboarding

**Key Exports**:

```typescript
export { BylineSDK }; // Main class
export { TokenVerifier }; // Token verification
export { AnalyticsTracker }; // Event tracking
export { EarningsManager }; // Earnings calculation
```

## Data Structures

### Token

```typescript
interface Token {
  articleId: string; // Article identifier
  reader: string; // Reader address
  publisher: string; // Publisher address
  issuedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (24h later)
  signature: string; // Cryptographic signature
  status: "valid" | "expired" | "invalid";
}
```

### Article

```typescript
interface Article {
  id: string; // Unique identifier
  title: string; // Article title
  content: string; // Full article text
  price: number; // Price in stroops
  publisher: string; // Publisher address
  publishedAt: number; // Unix timestamp
  tags: string[]; // Content categories
}
```

### Analytics Event

```typescript
interface ReadEvent {
  articleId: string; // Article read
  reader: string; // Reader address
  publisher: string; // Publisher address
  timestamp: number; // When read occurred
  duration: number; // Time spent reading (ms)
}
```

## Security Architecture

### Authentication Flow

```
1. Reader creates wallet (email-based)
   ↓
2. Reader funds wallet via Friendbot (testnet)
   ↓
3. Reader purchases article via contract
   ↓
4. Contract issues signed token
   ↓
5. Backend verifies token signature
   ↓
6. Access granted to article
```

### Security Measures

| Layer                | Mechanism                | Purpose                       |
| -------------------- | ------------------------ | ----------------------------- |
| **Transport**        | HTTPS only               | Prevent man-in-the-middle     |
| **Authentication**   | Cryptographic signatures | Verify token authenticity     |
| **Authorization**    | Publisher whitelist      | Prevent unauthorized earnings |
| **Tokens**           | 24-hour expiry           | Limit token lifetime          |
| **Replay Attack**    | Unique signatures        | Prevent token reuse           |
| **Input Validation** | Schema validation        | Prevent injection attacks     |
| **Rate Limiting**    | Request throttling       | Prevent abuse                 |

### Secret Management

```
Environment Variables (.env)
    ↓
Kept in runtime only (never logged)
    ↓
Signed tokens (contract verified)
    ↓
User localStorage (browser safe storage)
```

## Performance Characteristics

| Component      | Latency | Throughput        | Scaling                |
| -------------- | ------- | ----------------- | ---------------------- |
| Smart Contract | ~5s     | Network dependent | Stellar protocol       |
| Backend API    | ~100ms  | 1000s req/s       | Horizontal (stateless) |
| Frontend       | ~50ms   | User dependent    | Browser optimized      |
| SDK            | <1ms    | App dependent     | In-process             |

## Deployment Architecture

### Development Environment

```
Local Machine
├── Smart Contract (local Stellar network or testnet)
├── Reader App (localhost:5173)
└── Backend (localhost:3000)
```

### Production Environment

```
Stellar Mainnet
    ↑
CDN / Load Balancer
    ↑
Backend Cluster
    ├── API Servers (horizontal scaling)
    ├── Redis Cache (token caching)
    └── PostgreSQL (analytics persistence)

Vercel / Netlify / S3
    ↑
Reader App (static assets)

NPM Registry
    ↑
Publisher SDK
```

## Integration Points

### For Publishers Using SDK

```
Publisher App
    ↓ (POST /verify)
Byline Backend
    ↓ (Contract call)
Smart Contract
    ↓ (Response)
Byline Backend
    ↓ (Return result)
Publisher App
    ↓
Grant Access
```

### For Publishers Using Backend

```
Reader Browser
    ↓ (Purchase)
Smart Contract
    ↓ (Issue Token)
Reader Browser
    ↓ (Send Token)
Publisher Backend
    ↓ (Verify)
Byline Backend
    ↓ (Verify)
Publisher Backend
    ↓ (Grant Access)
Reader Browser
```

## Data Flow - Complete Purchase Journey

```
1. READER CREATES WALLET
   Reader → App: "Create wallet"
   App → Contract: Initialize wallet account
   Contract → Reader: Wallet address + keypair
   App → LocalStorage: Save wallet

2. READER FUNDS WALLET (testnet only)
   Reader → App: "Top up"
   App → Friendbot: Request 10,000 XLM
   Friendbot → Reader: Funds transferred
   App → UI: Balance updated

3. READER BROWSES ARTICLES
   App → Backend: GET /articles
   Backend → Contract: Query article list
   Contract → Backend: [Article list with prices]
   Backend → App: Return articles
   App → UI: Display articles

4. READER PURCHASES ARTICLE
   Reader → App: Click "Read Article"
   App → Contract: issue_token(article_id, reader, publisher)
   Contract: Verify reader has balance
   Contract: Transfer payment to publisher escrow
   Contract: Issue token with signature
   Contract → App: Token + signature
   App → UI: Article unlocked

5. READER VIEWS ARTICLE
   App: Verify token signature locally
   App: Verify token not expired
   App → UI: Display full article
   App → Backend: POST /record-read (token, article_id)
   Backend: Verify token signature
   Backend → Contract: Verify token validity
   Contract → Backend: Token valid
   Backend: Record read event
   Backend → Analytics: Update earnings

6. PUBLISHER CHECKS EARNINGS
   Publisher → Backend: GET /earnings
   Backend → Analytics: Calculate total earnings
   Analytics → Backend: Earnings data
   Backend → Publisher: Return earnings (formatted)
```

## Error Handling & Resilience

| Scenario        | Handling                       |
| --------------- | ------------------------------ |
| Network error   | Retry with exponential backoff |
| Invalid token   | Return 401 Unauthorized        |
| Expired token   | Return 403 Forbidden           |
| Missing article | Return 404 Not Found           |
| Rate limited    | Return 429 Too Many Requests   |
| Server error    | Log, retry, return 500         |

## Monitoring & Observability

### Metrics to Track

- Token verification success rate
- Contract call latency
- API endpoint response times
- Article read counts
- Publisher earnings
- User retention

### Logging

- Info: Normal operations
- Warn: Recoverable issues
- Error: Failures requiring attention
- Debug: Detailed troubleshooting data

### Alerts

- High error rate (>1%)
- Slow API responses (>1s)
- Contract failures
- Database unavailability

---

**For implementation details, see component-specific documentation in `docs/`.**

**For deployment guide, see `README.md`.**
