# Byline MVP Testnet Release Guide

Complete guide for deploying and testing Byline MVP on Stellar testnet.

## Pre-Deployment Checklist

### Code Review

- [ ] All tests passing locally
- [ ] No console errors or warnings
- [ ] Code review completed
- [ ] Security audit for smart contract
- [ ] Dependencies up to date and scanned for vulnerabilities

### Environment Setup

- [ ] Testnet account created with funding
- [ ] All environment variables configured
- [ ] Secrets management set up
- [ ] Database migrations tested locally
- [ ] Backup and recovery procedures documented

### Services Ready

- [ ] Soroban contract compiled and tested
- [ ] Publisher backend API deployed to staging
- [ ] Reader app built and tested
- [ ] Publisher SDK published to npm (test registry)
- [ ] All microservices health checks passing

## Step 1: Contract Deployment

### 1a. Setup Testnet Account

```bash
# Install Stellar CLI
npm install -g stellar-cli

# Create testnet keypair
stellar keys generate --testnet
# Output: Public Key, Secret Key

# Fund account from testnet faucet
curl "https://friendbot.stellar.org/?addr=GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O"
```

### 1b. Compile Contract

```bash
cd contract

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Soroban plugin
cargo install --locked stellar-cli

# Compile to WASM
cargo build --target wasm32-unknown-unknown --release

# Optimize WASM
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/byline_contract.wasm
```

### 1c. Deploy to Testnet

```bash
# Set testnet RPC endpoint
export STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
export NETWORK="testnet"

# Deploy contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/byline_contract_optimized.wasm \
  --source-account GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O \
  --network testnet

# Output: Contract ID (save this!)
# CBQY47FRHGBRAJPQZRUOXVO6BJ2QQ4WIMK6BLRESQ3SRXMX5NRINMWT
```

### 1d. Initialize Contract

```bash
stellar contract invoke \
  --contract-id CBQY47FRHGBRAJPQZRUOXVO6BJ2QQ4WIMK6BLRESQ3SRXMX5NRINMWT \
  --source GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O \
  --network testnet \
  -- \
  initialize \
  --admin GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O \
  --token CBQY47FRHGBRAJPQZRUOXVO6BJ2QQ4WIMK6BLRESQ3SRXMX5NRINMWT
```

**Save Output:**

```
Contract ID: CBQY47FRHGBRAJPQZRUOXVO6BJ2QQ4WIMK6BLRESQ3SRXMX5NRINMWT
Deploy Hash: <transaction-hash>
Network: testnet
Deployed At: <timestamp>
```

## Step 2: Backend Deployment

### 2a. Setup Environment

Create `.env.production`:

```bash
# Server Config
NODE_ENV=production
PORT=443
HOST=api.byline-testnet.local

# Contract
CONTRACT_ID=CBQY47FRHGBRAJPQZRUOXVO6BJ2QQ4WIMK6BLRESQ3SRXMX5NRINMWT
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# API Security
PUBLISHER_API_KEY=sk_test_xxxxxxxxxxxxxxxx
SDK_API_KEY=sk_sdk_xxxxxxxxxxxxxxxx

# Database
DB_HOST=postgres.byline-testnet.local
DB_PORT=5432
DB_NAME=byline_testnet
DB_USER=byline
DB_PASSWORD=<secure-password>

# Analytics
ANALYTICS_DB_HOST=postgres.byline-testnet.local
ANALYTICS_DB_NAME=byline_analytics_testnet

# CORS
CORS_ORIGIN=https://reader.byline-testnet.local
CORS_ORIGIN=https://publisher.byline-testnet.local
```

### 2b. Database Setup

```bash
# Create database
createdb byline_testnet -U postgres

# Run migrations
npm run migrate:prod

# Seed initial data
npm run seed:testnet
```

### 2c. Deploy Backend Service

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start service
npm start
# Or use PM2 for production:
pm2 start dist/server.js --name byline-api --env production

# Verify health
curl https://api.byline-testnet.local/health
# Response: { "status": "ok", "timestamp": "..." }
```

## Step 3: Frontend Deployment

### 3a. Reader App

Create `.env.production`:

```bash
VITE_API_URL=https://api.byline-testnet.local
VITE_CONTRACT_ID=CBQY47FRHGBRAJPQZRUOXVO6BJ2QQ4WIMK6BLRESQ3SRXMX5NRINMWT
VITE_STELLAR_NETWORK=testnet
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

Build and deploy:

```bash
cd reader-app

# Build
npm run build

# Deploy to CDN
npm run deploy:production
# Or deploy to web server:
cp -r dist/* /var/www/reader.byline-testnet.local/

# Verify
curl https://reader.byline-testnet.local
```

### 3b. Publisher Dashboard

Create `.env.production`:

```bash
VITE_API_URL=https://api.byline-testnet.local
VITE_APP_NAME=Byline Publisher (Testnet)
VITE_ENVIRONMENT=production
```

Build and deploy:

```bash
cd publisher-dashboard

npm run build
npm run deploy:production
# Or manually:
cp -r dist/* /var/www/publisher.byline-testnet.local/
```

## Step 4: Testing

### 4a. Contract Testing

```bash
# Unit tests
cd contract
cargo test

# Integration tests
cargo test --test integration_test

# Expected output:
# test integration_tests::test_full_payment_lifecycle ... ok
# test integration_tests::test_concurrent_purchases ... ok
# etc.
```

### 4b. API Testing

```bash
# Start backend in test mode
TEST_MODE=true npm start

# Run API tests
npm run test:api

# Test key endpoints:
curl -X POST https://api.byline-testnet.local/api/verify \
  -H "X-API-Key: sk_test_xxx" \
  -H "Content-Type: application/json" \
  -d '{"token": {...}, "contractId": "CBQY47..."}'

# Check response
# Should return: {"success": true, "verified": true, ...}
```

### 4c. End-to-End Testing

#### Test Case 1: Complete Payment Flow

```
1. User accesses reader app at https://reader.byline-testnet.local
2. User logs in with test Stellar account
3. User searches for article
4. User clicks "Buy Article"
5. User approves transaction in wallet
6. Backend verifies token
7. User sees article content
8. Publisher dashboard shows earnings update

Expected: All steps succeed without errors
```

#### Test Case 2: Token Expiration

```
1. User purchases article
2. Wait 24 hours (or mock time advance)
3. User attempts to verify token
4. Backend returns 403 Token Expired

Expected: Token correctly rejects after 24 hours
```

#### Test Case 3: Multiple Publishers

```
1. Publisher A registers 5 articles
2. Publisher B registers 3 articles
3. Reader purchases from both
4. Verify earnings tracked separately
5. Each publisher sees only their earnings

Expected: Earnings properly isolated
```

#### Test Case 4: Rate Limiting

```
1. Send 101 requests in 60 seconds
2. 101st request should fail with 429
3. Wait 60 seconds
4. Send another request - succeeds

Expected: Rate limiting enforced correctly
```

#### Test Case 5: Invalid Token

```
1. Create fake token with invalid signature
2. Send to /api/verify endpoint
3. Backend returns 403 Invalid Signature

Expected: Tampered tokens rejected
```

### 4d. Load Testing

```bash
# Install k6 if not present
brew install k6  # or use curl to install

# Run load test
k6 run tests/load-test.js

# Test configuration
# Virtual Users: 100
# Duration: 5 minutes
# Endpoints tested:
#   - GET /articles (100 req/s)
#   - POST /api/verify (50 req/s)
#   - POST /api/record-read (50 req/s)

# Expected results:
# - Average response time < 500ms
# - p95 response time < 1000ms
# - Error rate < 1%
```

### 4e. Security Testing

```bash
# Check for common vulnerabilities
npm audit
npm audit --production

# Test rate limiting
for i in {1..150}; do
  curl -s -X GET https://api.byline-testnet.local/api/earnings \
    -H "X-API-Key: test-key"
done
# Last requests should get 429

# Test API key validation
curl -X GET https://api.byline-testnet.local/api/earnings
# Should return 401 Unauthorized

# Test SQL injection prevention
curl -X POST https://api.byline-testnet.local/api/record-read \
  -H "Content-Type: application/json" \
  -d '{"articleId": "'; DROP TABLE articles; --"}'
# Should return 400 Bad Request, not SQL error
```

## Step 5: Monitoring Setup

### 5a. Error Tracking

Setup Sentry or similar:

```bash
# Add to backend
npm install @sentry/node

# Initialize in server.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: "testnet",
  tracesSampleRate: 0.1,
});
```

### 5b. Performance Monitoring

Setup DataDog, New Relic, or similar:

```bash
npm install dd-trace

# Trace all operations
```

### 5c. Logging

```bash
# View logs
tail -f logs/byline-api.log

# Key logs to monitor:
# - Purchase transactions
# - Token verification failures
# - Backend API errors
# - Contract call failures
```

## Step 6: Public Testnet Launch

### 6a. Announcement

Announce on:

- [ ] Twitter/X
- [ ] Discord server
- [ ] GitHub releases
- [ ] Email newsletter
- [ ] Blog post

**Announcement Template:**

```
🎉 Byline MVP now live on Stellar testnet!

Try the protocol:
- Reader App: https://reader.byline-testnet.local
- Publisher Dashboard: https://publisher.byline-testnet.local
- Contract: CBQY47FRHGBRAJPQZRUOXVO6BJ2QQ4WIMK6BLRESQ3SRXMX5NRINMWT

Get testnet XLM: https://friendbot.stellar.org

Documentation: https://docs.byline.local
GitHub: https://github.com/byline/byline
```

### 6b. Testnet Faucet Setup

Create a faucet for test XLM:

```bash
# Script: scripts/faucet.js
const StellarSdk = require("stellar-sdk");

const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
const faucetAccount = StellarSdk.Keypair.fromSecret(
  process.env.FAUCET_SECRET_KEY
);

app.post("/faucet", async (req, res) => {
  const { address, amount = 100 } = req.body;

  try {
    const account = await server.loadAccount(faucetAccount.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET_NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: address,
          asset: StellarSdk.Asset.native(),
          amount: amount.toString(),
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(faucetAccount);
    await server.submitTransaction(transaction);

    res.json({ success: true, txHash: transaction.hash() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
```

### 6c. Feedback Channels

Setup for community feedback:

- [ ] GitHub Issues for bug reports
- [ ] Discord channel for support
- [ ] Feedback form on website
- [ ] Email support: support@byline.local

## Rollback Procedures

### If Critical Bug Found

```bash
# 1. Identify issue
# 2. Fix code locally and test
# 3. Create hotfix branch
git checkout -b hotfix/issue-name

# 4. Commit fix
git commit -m "fix: description"

# 5. Redeploy backend
npm run build
pm2 restart byline-api

# 6. If frontend issue, rebuild and redeploy
cd reader-app
npm run build
npm run deploy:production

# 7. Monitor for resolution
tail -f logs/byline-api.log

# 8. Merge to main
git checkout main
git merge hotfix/issue-name
git push origin main
```

### If Contract Issue Found

**Note:** Smart contracts cannot be updated on-chain. Options:

1. **Deploy new contract version** (breaking change)
   - Create new contract with fixes
   - Deploy to new contract ID
   - Migrate users to new contract
   - Disable old contract

2. **Emergency pause**
   - Call pause() on contract
   - Prevents new transactions
   - Existing tokens still valid
   - Investigate and fix
   - Resume once safe

3. **Minor bugs** (non-security)
   - Document in release notes
   - Fix in next major version
   - Continue with current contract

## Post-Launch Monitoring

### 24-Hour Checklist

- [ ] All services running normally
- [ ] No error spikes in logs
- [ ] Payment processing normal
- [ ] Token verification working
- [ ] Analytics recording data
- [ ] No reports of user issues
- [ ] Contract events firing correctly

### Weekly Checklist

- [ ] Review analytics dashboard
- [ ] Check error logs for patterns
- [ ] Monitor system performance metrics
- [ ] Test backup and restore procedures
- [ ] Update security patches
- [ ] Review user feedback
- [ ] Verify database integrity

## Transition to Production

Once testnet is stable for 2+ weeks:

```bash
# 1. Prepare production contract
# - Repeat deployment steps with MAINNET network
# - Use STELLAR_MAINNET_NETWORK_PASSPHRASE
# - Deploy to https://soroban.stellar.org (production RPC)

# 2. Prepare production backend
# - Update environment variables for production
# - Configure production database
# - Set up production backups
# - Configure production SSL certificates

# 3. Prepare production frontend
# - Update API URLs to production
# - Enable production analytics
# - Configure production CDN

# 4. Security audit
# - Final code review
# - Penetration testing
# - Contract audit by third party
# - Security checklist sign-off

# 5. Gradual rollout
# - Deploy to small percentage of users (canary)
# - Monitor for issues
# - Increase to 100% users
# - Keep testnet running for testing new features
```

## Emergency Contact

For testnet issues:

- Discord: https://discord.gg/byline
- Email: support@byline.local
- GitHub Issues: https://github.com/byline/byline/issues
- Twitter: @byline_protocol
