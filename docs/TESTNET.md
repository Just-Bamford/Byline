# Byline Testnet Deployment Guide

## Testnet Contract Status

**Network:** Stellar Testnet  
**Status:** Ready for Deployment  
**Soroban RPC:** https://soroban-testnet.stellar.org

---

## Contract Deployment

### Prerequisites

```bash
# Install Soroban CLI
cargo install soroban-cli

# Verify installation
soroban --version

# Create or import testnet account
soroban config identity create testnet --global
# Funded with https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
```

### Build Contract

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
```

Output: `target/wasm32-unknown-unknown/release/byline.wasm`

### Deploy to Testnet

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/byline.wasm \
  --source testnet \
  --network testnet
```

**Result:** Contract ID (e.g., `CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4`)

Save this ID to `.env` files:

```bash
# publisher-backend/.env
SOROBAN_CONTRACT_ID=YOUR_CONTRACT_ID_HERE

# reader-app/.env
VITE_CONTRACT_ID=YOUR_CONTRACT_ID_HERE
```

---

## Test Flow: Purchase & Verify

### 1. Fund Testnet Wallet

```bash
# Get your testnet public key
soroban config identity address testnet

# Fund via Friendbot
curl "https://friendbot.stellar.org/?addr=GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON"

# Verify balance
soroban contract invoke \
  --source testnet \
  --network testnet \
  --contract CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4 \
  -- \
  get_balance \
  --reader GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON
```

### 2. Purchase Article Access

```bash
soroban contract invoke \
  --source testnet \
  --network testnet \
  --contract CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4 \
  -- \
  purchase_access \
  --reader GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON \
  --article_id article-1
```

**Response:**

```json
{
  "reader": "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
  "article_id": "article-1",
  "price": 2000,
  "timestamp": 1707129600,
  "expiry": 1707216000
}
```

### 3. Verify Token

```bash
soroban contract invoke \
  --source testnet \
  --network testnet \
  --contract CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4 \
  -- \
  verify_token \
  --reader GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON \
  --article_id article-1
```

**Response:** `true` (if token valid and not expired)

---

## View Transactions on Stellar Expert

After deployment and transactions, view them at:

**Stellar Expert Testnet Explorer:**  
https://testnet.stellar.expert

**Example Links:**

- Contract: https://testnet.stellar.expert/contract/CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4
- Transaction: https://testnet.stellar.expert/tx/YOUR_TX_HASH

---

## Live Testnet Demo (Coming Soon)

Once deployed, access the live demo at:

- **Reader App:** https://byline-reader.vercel.app
- **Publisher API:** https://byline-api.railway.app
- **Contract ID:** Will be updated here after deployment

---

## Troubleshooting

### Contract Build Fails

```
error: can't find crate for `core`
note: the `wasm32-unknown-unknown` target may not be installed
```

**Fix:**

```bash
rustup target add wasm32-unknown-unknown
```

### Deployment Fails with "Insufficient Balance"

The testnet account needs XLM. Fund via Friendbot:

```bash
# Get your public key
soroban config identity address testnet

# Fund it
curl "https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY"
```

### Transaction Not Found

Wait 5-10 seconds and check Stellar Expert again. Testnet transactions finalize in ~5 seconds.

---

## Next Steps

1. ✅ Contract compiled to WASM
2. ⏳ Deploy to Stellar Testnet (coming soon)
3. ⏳ Host backend API on cloud infrastructure
4. ⏳ Deploy reader app to Vercel
5. ⏳ End-to-end testing with real contract
6. ⏳ Security audit (third-party)
7. ⏳ Mainnet preparation

---

## Resources

- **Soroban Documentation:** https://soroban.stellar.org
- **Stellar Testnet Faucet:** https://friendbot.stellar.org
- **Stellar Expert Explorer:** https://testnet.stellar.expert
- **Soroban RPC API:** https://soroban-testnet.stellar.org
- **Stellar SDK (JavaScript):** https://github.com/stellar/js-stellar-sdk

---

## Questions?

Open an issue or discussion in the repository.

Last Updated: August 4, 2026
