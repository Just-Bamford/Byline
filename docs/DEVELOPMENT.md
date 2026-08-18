# Development Standards & Tooling

## Shared Configuration

All TypeScript components use consistent configuration:

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

## Component-Specific Setup

### Backend (publisher-backend/)

- Node.js 18+
- Express.js with TypeScript
- npm workspace compatible

### SDK (publisher-sdk/)

- Node.js 18+
- TypeScript 5
- Tree-shakeable exports

### Frontend (reader-app/)

- Node.js 18+
- React 18
- Vite bundler
- TypeScript 5

### Contract (contract/)

- Rust 1.70+
- Soroban SDK
- Cargo workspace compatible

## Development Workflow

1. **Clone repository**

   ```bash
   git clone https://github.com/yourusername/byline.git
   cd byline
   ```

2. **Install dependencies**

   ```bash
   cd publisher-backend && npm install
   cd ../publisher-sdk && npm install
   cd ../reader-app && npm install
   ```

3. **Start development servers**

   ```bash
   # Terminal 1: Backend
   cd publisher-backend && npm run dev

   # Terminal 2: Frontend
   cd reader-app && npm run dev
   ```

## Code Standards

- **Language**: TypeScript with strict mode
- **Formatting**: Consistent indentation (2 spaces)
- **Linting**: ESLint compatible
- **Testing**: Unit tests with frameworks of choice
- **Documentation**: JSDoc comments for public APIs
- **Error Handling**: Comprehensive try-catch with specific error types

## Component Boundaries

| Component         | Purpose                   | Language   | Framework  |
| ----------------- | ------------------------- | ---------- | ---------- |
| contract          | Access control & payments | Rust       | Soroban    |
| reader-app        | User interface            | TypeScript | React      |
| publisher-backend | Verification & analytics  | TypeScript | Express    |
| publisher-sdk     | Publisher integration     | TypeScript | Standalone |

## Repository Standards

- **Branching**: Feature branches from main
- **Commits**: Atomic, descriptive messages
- **PRs**: One feature per PR with tests
- **Documentation**: Updated with code changes
- **Versioning**: Semantic versioning per component

## Continuous Integration

Each component should include:

- [ ] Type checking (TypeScript)
- [ ] Linting (ESLint)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Build verification

## Environment Setup

See component-specific `.env.example` files for required variables.

## Deployment

Each component deploys independently:

- **Contract**: Stellar testnet/mainnet
- **Backend**: Docker or Node.js hosting
- **Frontend**: Static hosting (Vercel, Netlify, S3)
- **SDK**: NPM registry

---

See component READMEs for specific setup instructions.
