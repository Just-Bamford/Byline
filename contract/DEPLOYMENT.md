# Soroban Contract Deployment Guide

## Contract Overview

The Byline Soroban contract handles:

- Article registration by publishers
- Access token generation for readers
- Token verification and validation
- Read tracking and analytics
- Publisher authorization

## Prerequisites

### Install Stellar Tools

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Install Soroban CLI
cargo install --locked soroban-cli --tag v20.0.0

# Verify installation
soroban --version
```

### Setup Testnet Account

```bash
# Create keypair
soroban keys generate --network testnet byline-account

# Fund with testnet tokens via friendbot
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"

# Verify funding
soroban config identity show byline-account
```

## Build Process

### Compile Contract

```bash
cd contract

# Build in release mode (optimized)
cargo build --target wasm32-unknown-unknown --release

# Output: target/wasm32-unknown-unknown/release/byline_contract.wasm
```

### Verify Build

```bash
# Check WASM file size (should be < 500KB)
ls -lh target/wasm32-unknown-unknown/release/byline_contract.wasm

# Run linting checks
cargo clippy -- -D warnings

# Run tests
cargo test --target wasm32-unknown-unknown
```

## Deployment

### Deploy to Testnet

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/byline_contract.wasm \
  --source-account byline-account \
  --network testnet
```

**Output:**

```
CBVG3Z4VBW34DGRVW5YSQQ2XYGOWXHVCM25LJKSM2PQBKGXQJNFRHR7
```

Copy this contract ID and save it in `.env`:

```env
STELLAR_CONTRACT_ID=CBVG3Z4VBW34DGRVW5YSQQ2XYGOWXHVCM25LJKSM2PQBKGXQJNFRHR7
```

### Initialize Contract

```bash
soroban contract invoke \
  --id CBVG3Z4VBW34DGRVW5YSQQ2XYGOWXHVCM25LJKSM2PQBKGXQJNFRHR7 \
  --source-account byline-account \
  --network testnet \
  -- \
  initialize \
  --admin GBUQWP3BOUZX34ULNQG23RQ6F4BVDERBSUM2QYU5WRAPPER5OINANIBJLQ \
  --token CDLZFC3SYJYDZT7K6CEU7KIS4DDYNJEYWGQJZGKLWEIRMIC5UYTZ76T4
```

## Deployment Configuration

### Build Configuration (Cargo.toml)

```toml
[profile.release]
opt-level = "z"      # Maximum optimization
lto = true           # Link-time optimization
codegen-units = 1    # Single compilation unit
strip = true         # Strip symbols (reduces size)
```

### Environment Setup

Required `.env` variables during deployment:

```env
# Network
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK=Test SDF Network ; September 2015

# Account
STELLAR_ACCOUNT=byline-account
STELLAR_PRIVATE_KEY=your_private_key

# Contract
STELLAR_CONTRACT_ID=deployed_contract_id
STELLAR_ADMIN_ADDRESS=admin_address
STELLAR_TOKEN_ADDRESS=token_contract_address
```

## Post-Deployment Verification

### 1. Test Basic Operations

```bash
# Get article (should fail - no article registered)
soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account byline-account \
  --network testnet \
  -- \
  get_article \
  --article_id "test-article"
```

### 2. Register Test Article

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account byline-account \
  --network testnet \
  -- \
  register_article \
  --article_id "test-article-1" \
  --publisher GBUQWP3BOUZX34ULNQG23RQ6F4BVDERBSUM2QYU5WRAPPER5OINANIBJLQ \
  --price 1000
```

### 3. Verify Registration

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account byline-account \
  --network testnet \
  -- \
  get_article \
  --article_id "test-article-1"
```

## Upgrade Process

### For Testnet

```bash
# 1. Rebuild contract
cargo build --target wasm32-unknown-unknown --release

# 2. Deploy new version
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/byline_contract.wasm \
  --source-account byline-account \
  --network testnet

# 3. Note: This creates a NEW contract ID
# Old contract data is not migrated
```

### For Mainnet

1. **Security Review**: Have contract audited before mainnet
2. **Testnet Validation**: Test upgrade on testnet first
3. **Deployment**: Follow same process on mainnet
4. **Monitoring**: Watch for errors and unusual activity

## Monitoring & Maintenance

### View Contract State

```bash
# Get article data
soroban contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- \
  get_article \
  --article_id "article-1"

# Get read count
soroban contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- \
  get_article_reads \
  --article_id "article-1"
```

### Error Codes

| Code | Meaning              | Solution                    |
| ---- | -------------------- | --------------------------- |
| -1   | Article not found    | Register article first      |
| -2   | Unauthorized         | Require auth not satisfied  |
| -3   | Invalid token        | Token expired or not issued |
| -4   | Insufficient balance | Reader needs more XLM       |

## Performance Tuning

### Optimization Tips

1. **WASM Size**: Keep contract < 500KB
   - Remove unused dependencies
   - Use `strip = true` in Cargo.toml
   - Avoid large data structures

2. **Gas Optimization**:
   - Minimize storage operations
   - Cache frequently accessed data
   - Use efficient data structures

3. **Contract Size**: Monitor compiled size
   ```bash
   cargo build --target wasm32-unknown-unknown --release
   ls -lh target/wasm32-unknown-unknown/release/byline_contract.wasm
   ```

## Rollback Strategy

If deployment has issues:

1. **Identify Issue**: Check contract logs and errors
2. **Fix Code**: Update contract in `src/lib.rs`
3. **Retest**: Run unit tests locally
4. **Redeploy**: Deploy new version to testnet
5. **Notify Users**: Update contract ID in `.env`

## Security Checklist

- [ ] Contract uses `require_auth()` for protected functions
- [ ] No hardcoded secrets in contract
- [ ] Input validation on all public functions
- [ ] Access control verified (publisher-only, reader-only)
- [ ] Token expiry properly enforced
- [ ] Storage keys are unique (no collisions)
- [ ] Overflow protection on numerical operations
- [ ] Contract has been audited
- [ ] Mainnet deployment separate from testnet

## Next Steps

1. Build contract: `cargo build --target wasm32-unknown-unknown --release`
2. Deploy to testnet: Use deploy command above
3. Initialize: Call `initialize` function
4. Test: Register article, purchase access, verify token
5. Monitor: Watch contract performance and errors

---

See `CONTRACT_SPEC.md` for technical specification.
See `src/lib.rs` for implementation details.
