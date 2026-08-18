# Frontend Application Setup Guide

## Reader App Foundation

The Byline Reader App is a React + TypeScript application that enables readers to:

- Create blockchain wallets (email-based)
- Browse available articles
- Purchase article access with cryptocurrency
- Read articles with verified access
- Manage wallet balance

## Technology Stack

```
Frontend Framework    React 18
Language             TypeScript 5
Build Tool           Vite
Package Manager      npm
Styling              CSS3 + CSS Modules
State Management     React Hooks
HTTP Client          Fetch API
Blockchain           Stellar SDK
Database             Browser localStorage
```

## Project Structure

```
reader-app/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── WalletUI.tsx        # Wallet management interface
│   │   ├── WalletUI.css        # Wallet styling
│   │   ├── ArticleReader.tsx   # Article display component
│   │   └── ArticleReader.css   # Article styling
│   ├── lib/
│   │   └── wallet.ts           # Wallet manager class
│   ├── App.tsx                 # Main app component
│   ├── App.css                 # App-level styling
│   ├── main.tsx                # React entry point
│   ├── index.css               # Global styles
│   └── vite-env.d.ts          # Vite type definitions
├── index.html                  # HTML template
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies & scripts
└── .env.local                 # Environment variables
```

## Key Components

### WalletUI Component

Handles wallet operations:

```typescript
export interface WalletUIProps {
  onWalletCreated?: (wallet: Wallet) => void;
  onBalanceUpdate?: (balance: number) => void;
}

// Features:
// - Create wallet from email
// - Display wallet address
// - Show balance
// - Top up on testnet
// - Transaction history
```

**Responsibilities**:

- User input validation
- Wallet creation flow
- Balance display & updates
- Testnet funding (Friendbot)
- Error handling

### ArticleReader Component

Displays articles and handles purchases:

```typescript
export interface ArticleReaderProps {
  articles: Article[];
  wallet: Wallet;
  onPurchaseComplete?: (articleId: string, token: Token) => void;
}

// Features:
// - Article list display
// - Search & filtering
// - Purchase button
// - Token verification
// - Article content display
// - Read time estimation
```

**Responsibilities**:

- Fetch and display articles
- Handle purchase requests
- Verify tokens
- Display locked/unlocked content
- Track user engagement

### WalletManager Class

Core wallet logic:

```typescript
export class WalletManager {
  // Create new wallet
  static async createWallet(email: string): Promise<Wallet>;

  // Import existing wallet
  static async importWallet(secret: string): Promise<Wallet>;

  // Get wallet balance
  async getBalance(): Promise<number>;

  // Fund wallet (testnet)
  async fundWallet(amount: number): Promise<Transaction>;

  // Purchase article
  async purchaseArticle(
    articleId: string,
    price: number,
    publisherAddress: string,
  ): Promise<Token>;

  // Verify token validity
  static verifyToken(token: Token): boolean;
}
```

## Development Setup

### Prerequisites

```bash
# Required versions
node --version  # v18.0.0+
npm --version   # v9.0.0+
```

### Installation

```bash
cd reader-app
npm install
```

### Configuration

Create `.env.local`:

```env
VITE_API_URL=http://localhost:3000
VITE_STELLAR_NETWORK=Test SDF Network ; September 2015
STELLAR_CONTRACT_ID=your_contract_id_here
```

### Development Server

```bash
npm run dev
```

Starts Vite dev server at `http://localhost:5173`

Features:

- Hot module replacement (HMR)
- TypeScript checking
- Fast refresh
- Source maps

### Build for Production

```bash
npm run build
```

Outputs optimized bundle to `dist/`

## Application Flow

### 1. Wallet Creation Flow

```
Start
  ↓
User enters email
  ↓
Generate keypair (on device)
  ↓
Create Stellar account (via contract)
  ↓
Store in localStorage
  ↓
Fund with testnet tokens (Friendbot)
  ↓
Display wallet ready ✓
```

### 2. Article Purchase Flow

```
View article
  ↓
Click "Purchase"
  ↓
Confirm price
  ↓
Sign transaction with wallet
  ↓
Send to smart contract
  ↓
Contract issues token
  ↓
Token verified locally
  ↓
Article unlocked ✓
```

### 3. Article Read Flow

```
User opens article
  ↓
Verify token signature
  ↓
Check token expiry
  ↓
Display content
  ↓
Track read event
  ↓
Send to backend /record-read
  ↓
Backend updates earnings
```

## Styling Architecture

### CSS Organization

```
Global Styles (index.css)
├── CSS variables
├── Typography
├── Colors
└── Layout basics

Component Styles (Component.css)
├── Component-specific styles
├── Responsive breakpoints
└── Animation/transitions

App Styles (App.css)
└── App-level layout
```

### Design System

```css
/* Colors */
--primary:
  #1f2937 /* Dark gray */ --accent: #3b82f6 /* Blue */ --success: #10b981
    /* Green */ --warning: #f59e0b /* Amber */ --error: #ef4444 /* Red */
    --neutral-50: #f9fafb --neutral-900: #111827 /* Typography */
    --font-sans: -apple-system,
  BlinkMacSystemFont, "Segoe UI" --font-mono: "Monaco",
  "Courier New" /* Spacing */ --spacing-unit: 1rem --spacing-sm: 0.5rem
    --spacing-lg: 2rem /* Breakpoints */ --breakpoint-sm: 640px
    --breakpoint-md: 768px --breakpoint-lg: 1024px --breakpoint-xl: 1280px;
```

### Responsive Design

Mobile-first approach:

```
Mobile (< 640px)
  ├── Single column
  ├── Full-width buttons
  ├── Vertical nav

Tablet (640px - 1024px)
  ├── Two column grid
  ├── Horizontal nav

Desktop (> 1024px)
  ├── Three column grid
  ├── Sidebar nav
  └── Fixed header
```

## State Management

Uses React Hooks for simplicity:

```typescript
// Wallet state
const [wallet, setWallet] = useState<Wallet | null>(null);
const [balance, setBalance] = useState<number>(0);

// Article state
const [articles, setArticles] = useState<Article[]>([]);
const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

// UI state
const [loading, setLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
```

## Data Persistence

Uses browser `localStorage`:

```typescript
// Save wallet
localStorage.setItem("wallet", JSON.stringify(wallet));

// Load wallet on mount
useEffect(() => {
  const saved = localStorage.getItem("wallet");
  if (saved) setWallet(JSON.parse(saved));
}, []);

// Clear on logout
localStorage.removeItem("wallet");
```

## Error Handling

```typescript
try {
  // Attempt operation
  const result = await performAction();
} catch (err) {
  if (err instanceof NetworkError) {
    // Handle network issues (retry)
  } else if (err instanceof ValidationError) {
    // Handle validation (user feedback)
  } else if (err instanceof ContractError) {
    // Handle contract issues (inform user)
  } else {
    // Handle unknown errors (log, inform user)
  }
}
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load components
const ArticleReader = lazy(() => import('./components/ArticleReader'))
const WalletUI = lazy(() => import('./components/WalletUI'))

<Suspense fallback={<Loading />}>
  <ArticleReader />
</Suspense>
```

### Caching

```typescript
// Cache articles for 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
const [articles, setArticles] = useState([]);
const [cachedAt, setCachedAt] = useState<number | null>(null);

useEffect(() => {
  const now = Date.now();
  if (!cachedAt || now - cachedAt > CACHE_TTL) {
    fetchArticles().then((data) => {
      setArticles(data);
      setCachedAt(now);
    });
  }
}, []);
```

### Asset Optimization

- Minified CSS/JS in production
- Tree-shaking for unused code
- Image optimization (WebP)
- Gzip compression

## Testing Strategy

### Unit Tests

```typescript
// Test wallet creation
test("creates wallet from email", async () => {
  const wallet = await WalletManager.createWallet("user@example.com");
  expect(wallet.address).toBeDefined();
  expect(wallet.email).toBe("user@example.com");
});

// Test token verification
test("verifies valid token", () => {
  const token = createMockToken();
  expect(WalletManager.verifyToken(token)).toBe(true);
});
```

### Integration Tests

```typescript
// Test purchase flow
test("completes article purchase", async () => {
  const wallet = await createTestWallet();
  const article = createMockArticle();
  const token = await wallet.purchaseArticle(article.id);
  expect(token.articleId).toBe(article.id);
});
```

## Deployment

### Build for Production

```bash
npm run build
```

Outputs to `dist/` directory.

### Hosting Options

| Platform     | Setup               | URL                |
| ------------ | ------------------- | ------------------ |
| Vercel       | `vercel deploy`     | auto-generated     |
| Netlify      | Drag & drop `dist/` | auto-generated     |
| AWS S3       | Upload to bucket    | custom domain      |
| GitHub Pages | Push to gh-pages    | username.github.io |

### Environment for Production

```env
VITE_API_URL=https://api.byline.io
VITE_STELLAR_NETWORK=Public Global Stellar Network
STELLAR_CONTRACT_ID=production_contract_id
```

## Troubleshooting

### Issue: "Module not found"

→ Run `npm install` again or check import paths

### Issue: "CORS error"

→ Verify backend CORS_ORIGIN includes frontend URL

### Issue: "Token invalid"

→ Check contract ID matches between frontend and backend

### Issue: "Slow performance"

→ Check Network tab for slow API calls, enable caching

## Next Steps

1. **Verify setup**: `npm run build && npm run preview`
2. **Test flows**: Manual testing of wallet & purchase
3. **Deploy**: Choose hosting and deploy `dist/`
4. **Monitor**: Track errors and user engagement

---

See `README.md` for complete project overview.
See `ARCHITECTURE.md` for system design details.
See `docs/` for protocol and integration documentation.
