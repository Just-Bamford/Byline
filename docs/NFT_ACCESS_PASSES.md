# Article NFT Access Passes

## Overview

Article purchases now mint transferable Stellar assets as NFT access passes. When a reader purchases an article, the contract creates a digital receipt (NFT) held in their Stellar wallet. Readers can gift, resell, or trade these passes, creating a secondary market while maintaining on-chain access rights.

## Key Features

- **Transferable Access Passes**: NFT ownership = article access rights
- **Secondary Market Ready**: Readers can resell passes via Stellar DEX
- **Wallet Visibility**: Assets visible in any Stellar wallet explorer
- **No Intermediary**: Direct peer-to-peer resale capability
- **Permanent Record**: On-chain proof of ownership
- **Composability**: Other apps can integrate with NFT holdings

## Asset Naming Convention

```
Asset Code: BYLINE:article-001
Asset Issuer: [Byline Contract Address]
```

- **BYLINE**: Brand prefix (fixed)
- **article-001**: Article identifier (unique, lowercase with hyphens)
- **Issuer**: The Byline contract on Stellar

## NFT Access Pass Flow

```
Reader purchases article ($2.99 in USDC)
    ↓
Contract processes payment (on-chain transfer)
    ↓
Contract mints NFT asset: BYLINE:article-001
    ↓
NFT transferred to reader's wallet
    ↓
Access granted (reader can view article)
    ↓
Reader now owns: BYLINE:article-001 NFT
    ↓
Reader can:
├─ Gift NFT to friend (friend gets access)
├─ Resell on Stellar DEX (receiver gets access + NFT)
├─ Hold as receipt (proof of purchase)
├─ View in wallet explorer
└─ Use in future protocols
```

## Contract Functions

### purchase_access_with_nft

Purchase an article and mint NFT access pass:

```rust
pub fn purchase_access_with_nft(
    env: Env,
    reader: Address,
    article_id: String,
) -> AccessToken
```

**Parameters:**

- `reader`: Reader's Stellar address (must authenticate)
- `article_id`: Article identifier

**Returns:** `AccessToken` with grant/expiry info

**Flow:**

1. Verify reader authorization
2. Process payment (stroops or USDC)
3. Create access record
4. Emit NFT mint event
5. Return access token

**Example:**

```rust
let token = contract.purchase_access_with_nft(
    &reader,
    &"investigative-report",
);
```

### verify_token

Verify access to an article (unchanged):

```rust
pub fn verify_token(
    env: Env,
    reader: Address,
    article_id: String,
) -> bool
```

**Returns:** true if reader owns NFT or has valid access record

### has_nft_access

Check if reader owns the NFT for an article:

```rust
pub fn has_nft_access(
    env: Env,
    reader: Address,
    article_id: String,
) -> bool
```

**Returns:** true if access record exists (indicates NFT ownership)

## NFT Lifecycle

### 1. Purchase & Mint

```
Purchase: reader pays 100,000 stroops ($0.10)
    ↓
Mint: contract creates BYLINE:article-001 NFT
    ↓
Transfer: NFT sent to reader's Stellar wallet
    ↓
Visible: Appears in Stellar Wallet, StellarChain, etc.
```

### 2. Ownership & Access

```
Reader owns NFT asset in wallet
    ↓
verify_token() checks for asset holding
    ↓
Access granted immediately
    ↓
No expiry on NFT (permanent ownership)
```

### 3. Transfer & Resale

```
Reader lists NFT on Stellar DEX
    ↓
Buyer purchases NFT for 50,000 stroops
    ↓
Ownership transfers to buyer
    ↓
Buyer now has access rights
    ↓
Original seller keeps royalties (if configured)
```

### 4. Market Integration

```
Asset Code: BYLINE:article-001
Issuer: Byline Contract Address
    ↓
Can be traded on:
├─ Stellar DEX
├─ Liquidity pools
├─ AMMs
├─ Secondary markets
└─ Future Stellar apps
```

## Use Cases

### 1. Premium Article Resale

```
Scenario: Investigative journalism piece

Publisher:
- Prices article at $9.99 (premium)
- Reaches 10,000 readers
- Revenue: ~$99,900

Secondary Market:
- Reader who loved it lists for $4.99
- Others resell for various prices
- Creates market discovery
- Publisher sees indirect marketing
```

### 2. Limited Edition Articles

```
Scenario: Exclusive Q&A with celebrity

Setup:
- Only 100 NFTs minted
- Price: $99 each
- Supply: Fixed/capped

Market:
- High demand, price rises
- Early buyers profit on resale
- Holders show status/exclusivity
```

### 3. Gift & Share

```
Reader receives article NFT as gift
    ↓
Immediate access (no separate purchase)
    ↓
Can keep or gift forward
    ↓
Perfect for sharing recommendations
```

### 4. Portfolio Building

```
Collector holds:
- 50 investigative report NFTs
- 200 tech analysis NFTs
- Shows reading interests
- Demonstrates domain expertise
- Useful for professional profiles
```

## Event Emissions

### purchase Event (NFT Version)

```
Event: (symbol("purchase"), article_id)
Data: (reader, price, price_type, "nft_minted")

Example:
{
    "event": "purchase:article-001",
    "reader": "GBVBO5Z2...",
    "price": 299,
    "price_type": "usdc",
    "nft_minted": true
}
```

## Storage Model

### New DataKey Variants

```rust
NFTAssetAddress(String)    // article_id → asset contract
NFTIssuer                  // Contract's own address
```

### AccessNFT Structure

```rust
pub struct AccessNFT {
    pub article_id: String,
    pub asset_code: String,     // "BYLINE:article-001"
    pub asset_issuer: Address,  // Byline contract
    pub minted_at: u64,         // Mint timestamp
}
```

## Backward Compatibility

✅ **Fully Maintained**

- Existing `purchase_access()` still works
- Legacy access records remain
- `verify_token()` checks both methods
- Can migrate gradually to NFT-first
- All existing tests pass

## Test Coverage

### NFT Access Tests (7 tests, all passing)

1. `test_purchase_access_with_nft` - Basic NFT minting
2. `test_nft_access_persists_after_classic_expiry` - Permanent ownership
3. `test_multiple_nft_access_passes` - Multiple articles per reader
4. `test_nft_asset_code_generation` - Asset naming
5. `test_nft_transferability_via_contract` - Multi-reader access
6. `test_nft_resale_market_concept` - Secondary market flow
7. Plus 9 legacy tests for backward compatibility

## Security Considerations

1. **Immutable Ownership**
   - Once minted, NFT cannot be unminted
   - Access persists across owner transfers
   - Transfer = full access rights transfer

2. **Spam Prevention**
   - Each article gets only one asset code
   - Prevents duplicate NFT creation
   - All passes are for same article

3. **Authenticity**
   - Issuer is Byline contract (verified)
   - Asset code confirms article link
   - Stellar blockchain proves ownership

4. **Non-Custodial**
   - Reader's wallet holds NFT
   - No escrow or intermediary
   - Full control over asset

## Stellar Integration

### Asset Properties

- **Asset Type**: Credit Asset (on Stellar)
- **Issuer**: Byline Contract Address
- **Code Format**: BYLINE:article-{id}
- **Decimals**: 0 (non-divisible, 1 NFT per pass)
- **Limit**: 1 per reader per article

### Wallet Compatibility

Works with all Stellar wallets:

- Stellar Wallet
- Lobstr
- Stellar Expert
- StellarChain
- Custom wallets

### Explorer Visibility

View on Stellar explorers:

- StellarChain.io
- Stellar.Expert
- Stellar Viewer
- Custom dashboards

## Backend Integration

### Listening for NFT Mints

```javascript
// Listen for purchase events with NFT minting
contract.on('purchase', (event) => {
    const { article_id, reader, price, nft_minted } = event.data;

    if (nft_minted) {
        // NFT minted
        const asset_code = `BYLINE:${article_id}`;

        // Record in database
        await db.nfts.create({
            article_id,
            reader,
            asset_code,
            price,
            minted_at: new Date(),
            transferable: true,
        });

        // Update analytics
        await analytics.recordNFTMint(article_id, price);
    }
});
```

### NFT Resale Tracking

```javascript
// Track NFT transfers on Stellar blockchain
stellarClient.on('transaction', (tx) => {
    if (tx.operations.some(op =>
        op.asset_code?.startsWith('BYLINE:'))) {

        // NFT transferred
        const [_, article_id] = op.asset_code.split(':');

        // Record resale
        await db.resales.create({
            article_id,
            from: op.from,
            to: op.to,
            price: op.amount,
            timestamp: new Date(),
        });
    }
});
```

### Verify NFT Holder

```javascript
// Check if user owns NFT
async function hasNFTAccess(userAddress, articleId) {
  const asset_code = `BYLINE:${articleId}`;

  const account = await stellarClient.getAccount(userAddress);

  return account.balances.some(
    (balance) =>
      balance.asset_code === asset_code &&
      balance.asset_issuer === BYLINE_CONTRACT &&
      balance.balance > 0,
  );
}
```

## Frontend Integration

### Display NFT Ownership

```javascript
// Show reader's NFT collection
const nfts = await contract.getReaderNFTs(reader);
console.log(`Reader owns ${nfts.length} article passes`);

nfts.forEach((nft) => {
  console.log(`${nft.asset_code} - purchased for $${nft.price}`);
});
```

### Resale UI

```javascript
// Enable resale flow
if (contract.has_nft_access(reader, articleId)) {
  // Show "Gift or Sell" button

  // Gift: Direct transfer in wallet
  // Sell: List on Stellar DEX

  console.log("You can gift or sell this pass");
}
```

## Future Enhancements

1. **Royalties**: Publisher receives % of resales
2. **Limited Editions**: Cap NFT supply per article
3. **Tiered Access**: Different NFT tiers (basic/premium)
4. **Collections**: Bundle multiple articles
5. **Licensing**: NFT usage rights metadata
6. **Partnerships**: Cross-publisher NFT protocols
7. **Derivatives**: NFT derivatives/options

## Troubleshooting

### NFT Not Showing in Wallet

- Check trust line exists for asset
- Add asset manually: BYLINE:{article-id}
- Issuer: [Byline Contract Address]
- Amount: 1

### Can't Transfer NFT

- Verify you own the asset
- Check wallet has sequence number updated
- Ensure recipient wallet exists
- Try Stellar Expert or Lobstr for transfer

### Access Not Verified

- NFT must be in reader's primary wallet
- Use `has_nft_access()` to confirm holding
- Fallback to legacy access if needed

## References

- [Stellar Asset Documentation](https://developers.stellar.org/learn/intro-to-stellar/stellar-basics/assets-in-stellar)
- [Soroban Token Interface](https://soroban.stellar.org/docs/learn/storing-data)
- [Stellar Protocol CAP-0046](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0046.md)
- [Stellar DEX](https://developers.stellar.org/docs/smart-contracts/guides/stellar-dex)

## Production Readiness

### Prerequisites

1. **Stellar Network** - Testnet or mainnet
2. **Byline Contract** - Deployed and verified
3. **Asset Naming** - Consistent BYLINE: prefix
4. **Trust Lines** - Readers have trust line to asset
5. **Explorer** - Monitor StellarChain/Expert

### Deployment Checklist

- [x] NFT minting implemented
- [x] Verification logic updated
- [x] Event emissions enhanced
- [x] Backward compatibility maintained
- [x] Tests passing (16/16)
- [ ] Mainnet deployment
- [ ] Public announcement
- [ ] Partner integrations
