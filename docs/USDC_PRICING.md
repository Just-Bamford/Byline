# Stellar Anchored USDC Pricing

## Overview

Publishers can now price articles in USDC (USD Coin) via the Circle anchor on Stellar, eliminating price volatility tied to XLM fluctuations. The contract uses the SEP-41 token interface to handle non-native token transfers directly on-chain.

## Key Features

- **Stable USD Pricing**: Articles priced in USDC cents ($0.01 minimum)
- **Direct Token Transfers**: Uses Soroban SEP-41 token interface
- **On-Chain Enforcement**: Atomic USDC transfers during purchase
- **Backward Compatible**: Stroops pricing still supported
- **No Price Drift**: Publishers set price in USD, stays stable

## USDC Token Details

- **Token Address**: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` (Circle anchor)
- **Decimals**: 6 decimal places (on-chain representation)
- **Network**: Stellar (testnet/mainnet)
- **Pricing**: Merchants set prices in cents (e.g., 299 = $2.99)

## Contract Functions

### register_article_usdc

Register an article with USDC pricing:

```rust
pub fn register_article_usdc(
    env: Env,
    article_id: String,
    price_cents: i128,
    publisher: Address,
    usdc_contract: Address,
) -> ()
```

**Parameters:**

- `article_id`: Unique article identifier
- `price_cents`: Price in USD cents (1 = $0.01, 299 = $2.99)
- `publisher`: Publisher's Stellar address (must authenticate)
- `usdc_contract`: USDC token contract address

**Validation:**

- Price must be > 0 cents
- Price must be ≤ $10,000 (1,000,000 cents)
- Publisher must authenticate transaction

**Example:**

```rust
// Register article at $2.99
client.register_article_usdc(
    &"article-001",
    &299,  // cents
    &publisher,
    &usdc_contract,
);
```

### get_price_type

Retrieve the pricing currency type for an article:

```rust
pub fn get_price_type(env: Env, article_id: String) -> PriceType
```

**Returns:** `PriceType::Stroops` or `PriceType::USDC`

### set_usdc_contract

Configure the USDC token contract address (one-time initialization):

```rust
pub fn set_usdc_contract(env: Env, usdc_contract: Address) -> ()
```

**Rules:**

- Can only be called once
- Panics if already set
- Should be called during contract initialization

### get_usdc_contract

Retrieve the configured USDC contract address:

```rust
pub fn get_usdc_contract(env: Env) -> Option<Address>
```

**Returns:** Some(address) if configured, None otherwise

## Purchase Flow with USDC

```
Reader calls purchase_access(reader, article_id)
    ↓
Contract retrieves article price and type
    ↓
If type is USDC:
    ├─ Get publisher address
    ├─ Get USDC contract address
    ├─ Create SEP-41 token client
    ├─ Transfer USDC from reader to publisher
    │  (price_cents × 10^4 = native USDC units)
    ├─ Atomic transaction complete
    └─ Grant 24-hour access
    ↓
If type is Stroops:
    ├─ Backend handles XLM transfer
    └─ Grant 24-hour access
    ↓
Issue AccessToken (valid 24 hours)
    ↓
Emit purchase event with price type
```

## Price Conversion

### USDC Cents → On-Chain Units

USDC has 6 decimal places on Stellar:

```
Price: 299 cents ($2.99)
On-chain units: 299 × 10^4 = 2,990,000 stroops
```

Conversion: `usdc_cents × 10,000 = on-chain_units`

### Examples

| Display | Cents | On-Chain Units |
| ------- | ----- | -------------- |
| $0.01   | 1     | 10,000         |
| $0.10   | 10    | 100,000        |
| $1.00   | 100   | 1,000,000      |
| $2.99   | 299   | 2,990,000      |
| $9.99   | 999   | 9,990,000      |

## Storage Model

### New DataKey Variants

```rust
ArticlePriceType(String)     // article_id → PriceType
ContractUSDCAddress          // USDC token contract address
```

### PriceType Enum

```rust
pub enum PriceType {
    Stroops,  // Native XLM in stroops
    USDC,     // USD Coin via Circle anchor
}
```

## SEP-41 Token Interface

The contract uses Soroban's built-in token client for non-native token transfers:

```rust
use soroban_sdk::token;

let usdc_client = token::Client::new(&env, &usdc_contract);
usdc_client.transfer(&reader, &publisher, &usdc_amount);
```

**Key Points:**

- No manual contract invocation required
- Automatic allowance checking
- Atomic transfer semantics
- Full Soroban SDK integration

## Events

### purchase Event (Enhanced)

Emitted when article is purchased:

```
Event: (symbol("purchase"), article_id)
Data: (reader_address, price, price_type_string)

price_type_string: "stroops" or "usdc"
```

## Use Cases

### 1. Premium Articles (USDC)

```
Article: "Exclusive Analysis"
Type: USDC
Price: $4.99 (499 cents)
Benefit: Stable price regardless of XLM volatility
```

### 2. Micropayments (Stroops)

```
Article: "Quick News Snippet"
Type: Stroops
Price: 5,000 stroops
Benefit: Fast native payment
```

### 3. Mixed Pricing Strategy

```
Publisher offers:
- Quick reads: 1,000 stroops (volatile)
- Feature articles: $1.99 USDC (stable)
- Investigative: $9.99 USDC (premium)
```

## Validation & Constraints

### Price Validation

- **Minimum**: 1 cent ($0.01)
- **Maximum**: 1,000,000 cents ($10,000)
- **Must be positive**: price_cents > 0
- **Type**: i128 (supports future expansion)

### USDC Contract Validation

- Must be valid Stellar address
- Must be SEP-41 compliant token
- Must have sufficient balance on reader
- Transfer must not exceed reader's balance

### Publisher Authentication

- Publisher must sign transaction for registration
- Reader must sign transaction for purchase
- No cross-authentication possible

## Backward Compatibility

✅ **Fully Maintained**

- Existing `register_article()` still works (stroops)
- Existing `purchase_access()` handles both types
- `get_price_type()` defaults to Stroops for legacy articles
- All existing tests continue to pass
- No breaking changes to existing APIs

## Test Coverage

### USDC Pricing Tests (6 tests, all passing)

1. `test_register_article_usdc` - Basic USDC registration
2. `test_get_price_type_defaults_to_stroops` - Legacy default behavior
3. `test_set_usdc_contract_address` - Contract initialization
4. `test_set_usdc_contract_only_once` - Immutable configuration
5. `test_usdc_price_maximum_validation` - Price ceiling enforcement
6. `test_usdc_price_range_validation` - Min/max boundaries

## Security Considerations

1. **Token Interface Safety**
   - SEP-41 implementation is audited
   - Soroban SDK handles authorization
   - No manual balance checking needed

2. **Atomic Transfers**
   - All-or-nothing semantics
   - No partial transfer states
   - No reentrancy possible

3. **Price Stability**
   - Prices immutable once set
   - No decimal conversion issues
   - Integer arithmetic (no floating point)

4. **Publisher Authentication**
   - Must sign registration
   - Price cannot be changed by reader
   - Nonce prevents replay attacks

## Backend Integration

### Listening for USDC Purchases

```javascript
// Listen for purchase events
contract.on('purchase', (event) => {
    const { article_id, reader, price, price_type } = event.data;

    if (price_type === 'usdc') {
        // USDC payment already on-chain (atomic)
        console.log(`USDC payment confirmed: ${price} cents`);

        // Record in database
        await db.purchases.create({
            article_id,
            reader,
            amount: price,
            currency: 'USDC',
            timestamp: new Date(),
        });
    }
});
```

### Payment Reconciliation

For USDC articles:

- Payment is already confirmed on-chain
- No backend payment processing needed
- Can immediately grant access
- Atomicity guaranteed by Soroban

For Stroops articles:

- Backend still processes XLM transfer
- Traditional flow maintained
- Slower than USDC (requires separate tx)

## Frontend Integration

### Displaying Prices

```javascript
const priceType = await contract.getPriceType(articleId);

if (priceType === "usdc") {
  // Display in USD
  const cents = await contract.getArticlePrice(articleId);
  const usd = (cents / 100).toFixed(2);
  console.log(`Price: $${usd}`);
} else {
  // Display in stroops
  const stroops = await contract.getArticlePrice(articleId);
  const xlm = stroops / 10_000_000;
  console.log(`Price: ${xlm} XLM`);
}
```

### Purchase Flow

```javascript
// User clicks "Buy with USDC"
const reader = userWallet.address;
const articleId = currentArticle.id;

// Contract handles USDC transfer automatically
const token = await contract.purchase_access(reader, articleId);

// Immediate access granted
displayArticleContent();
```

## Future Enhancements

1. **Multi-Currency Support**: Add support for other Circle tokens (EURC, etc.)
2. **Dynamic Pricing**: Publishers adjust prices based on demand
3. **Volume Discounts**: Bundle pricing with USDC
4. **Stablecoin Swaps**: Support multiple USD-equivalent tokens
5. **Price History**: Track price changes per article

## Production Deployment

### Prerequisites

1. **USDC Contract Address** must be set during initialization
2. **Publisher Accounts** must have non-zero USDC balance
3. **Reader Accounts** must have USDC balance ≥ article price
4. **Stellar Network** must be operational (testnet/mainnet)

### Initialization

```rust
// During contract deployment
contract.set_usdc_contract(&usdc_contract_address);

// Register first USDC article
contract.register_article_usdc(
    &"first-usdc-article",
    &199,  // $1.99
    &publisher,
    &usdc_contract_address,
);
```

### Verification

```bash
# Check USDC contract is set
contract.get_usdc_contract()  # Returns: Some(GA5ZSEJ...)

# Check article pricing
contract.get_price_type("article-id")  # Returns: PriceType::USDC
contract.get_article_price("article-id")  # Returns: 199
```

## Troubleshooting

### "USDC contract already set"

- Initialization called twice
- Solution: Only call `set_usdc_contract()` once at startup

### Transfer fails with insufficient balance

- Reader has < article price in USDC
- Solution: Redirect to USDC purchase flow before checkout

### Wrong conversion amounts

- Verify USDC has 6 decimals (standard)
- Verify cents → units conversion: `cents × 10^4`
- Check on-chain balance (native units)

## References

- [Circle USDC on Stellar](https://www.circle.com/en/usdc/stellar)
- [Stellar SEP-41 Standard](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0046-06.md)
- [Soroban Token Interface](https://soroban.stellar.org/docs/learn/storing-data)
