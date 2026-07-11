# Environment Configuration Guide

## Overview

Each component in the Byline monorepo requires environment variables for proper operation. This guide explains how to configure your development environment.

## Quick Setup

1. **Copy template to each component**

   ```bash
   cp .env.template publisher-backend/.env
   cp .env.template publisher-sdk/.env
   cp .env.template reader-app/.env.local
   ```

2. **Update with your values** (see component sections below)

3. **Never commit `.env` files** - they contain secrets

## Component Configuration

### Publisher Backend (`publisher-backend/.env`)

```env
# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Stellar Network
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_CONTRACT_ID=your_contract_id

# Token Settings
TOKEN_EXPIRY_HOURS=24
TOKEN_CACHE_TTL_MINUTES=5

# Security
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
HTTPS_ONLY=false
```

**Environment-Specific Values:**

| Variable        | Development | Production |
| --------------- | ----------- | ---------- |
| NODE_ENV        | development | production |
| HTTPS_ONLY      | false       | true       |
| STELLAR_RPC_URL | testnet     | mainnet    |
| LOG_LEVEL       | debug       | info       |

### Reader App (`reader-app/.env.local`)

```env
# API Configuration
VITE_API_URL=http://localhost:3000

# Stellar Network
VITE_STELLAR_NETWORK=Test SDF Network ; September 2015
STELLAR_CONTRACT_ID=your_contract_id
```

**Development vs Production:**

| Setting              | Development           | Production                    |
| -------------------- | --------------------- | ----------------------------- |
| VITE_API_URL         | http://localhost:3000 | https://api.byline.io         |
| VITE_STELLAR_NETWORK | Test SDF Network      | Public Global Stellar Network |

### Publisher SDK (`publisher-sdk/.env`)

```env
# Backend Configuration
PUBLISHER_API_URL=http://localhost:3000
PUBLISHER_ID=your_publisher_id
PUBLISHER_SECRET=your_secret_key
```

### Smart Contract (`contract/`)

Environment variables via command-line during deployment:

```bash
soroban contract deploy \
  --network testnet \
  --source-account account_id \
  -- \
  init --admin admin_address
```

## Getting Required Values

### STELLAR_CONTRACT_ID

1. Deploy the contract:

   ```bash
   cd contract
   soroban contract deploy --network testnet --source-account your_account
   ```

2. Copy the returned contract ID

3. Add to all `.env` files

### PUBLISHER_ID & PUBLISHER_SECRET

Obtained during publisher onboarding:

1. Run `npm run setup` in `publisher-backend`
2. Follow onboarding prompts
3. Save credentials to `.env`

### STELLAR_RPC_URL

Use one of:

- **Development**: `https://soroban-testnet.stellar.org`
- **Production**: `https://soroban-mainnet.stellar.org`

## Security Best Practices

### ✅ Do

- Use `.env.example` or `.env.template` for reference
- Store secrets in environment variables
- Rotate secrets regularly
- Use different secrets per environment
- Document all required variables
- Add `.env` to `.gitignore`

### ❌ Don't

- Commit `.env` files
- Use same secrets in dev/prod
- Hardcode secrets in code
- Share secrets via chat/email
- Use placeholder values in production
- Log sensitive values

## Verification

After setting up `.env` files, verify configuration:

**Backend:**

```bash
cd publisher-backend
npm run verify-env
# or manually check with: cat .env | grep -v '^#'
```

**Frontend:**

```bash
cd reader-app
npm run verify-env
# Check that VITE_ variables are set
```

## Troubleshooting

### "Contract ID not found"

→ Make sure `STELLAR_CONTRACT_ID` is set in all `.env` files

### "Network error connecting to RPC"

→ Check `STELLAR_RPC_URL` is correct and network is reachable

### "Invalid PUBLISHER_SECRET"

→ Re-run onboarding process to get fresh credentials

### "CORS error from frontend"

→ Ensure `CORS_ORIGIN` in backend `.env` includes frontend URL

## Environment Files by Component

```
byline/
├── .env.template           # Master template
├── .env                    # (root, if needed)
├── contract/               # No .env needed
├── reader-app/
│   └── .env.local          # Frontend config
├── publisher-backend/
│   └── .env                # Backend config
└── publisher-sdk/
    └── .env                # SDK config
```

## Next Steps

1. Run quick setup: `npm run setup` in each component
2. Start development servers: `npm run dev`
3. Test all endpoints: `npm run test`
4. Check verification: `npm run verify-env`

---

For component-specific setup, see each component's README.
