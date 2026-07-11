# Soroban Contract Storage Models

## Overview

The Byline contract uses three main data structures for persistent storage on the Stellar ledger:

1. **Article** - Published articles with pricing
2. **AccessToken** - Reader access credentials (24-hour validity)
3. **ReadEvent** - Analytics data for reads and engagement

## Article Model

### Structure

```rust
pub struct Article {
    pub id: String,              // Unique article identifier
    pub publisher: Address,      // Publisher's Stellar address
    pub price: i128,             // Price in stroops
    pub created_at: u64,         // Unix timestamp
    pub title: String,           // Article title
    pub category: String,        // Category/tags
}
```

### Storage

Articles are stored in persistent contract storage:

```
Key:   article:{ article_id }
Value: Article { ... }
```

### Lifecycle

```
Register Article
    ↓ (publisher calls register_article)
Stored in persistent storage
    ↓ (available for purchase)
Readers can purchase access
    ↓ (through purchase_access)
Earnings tracked on blockchain
```

### Example

```json
{
  "id": "politics-2024-election",
  "publisher": "GBUQWP3BOUZX34ULNQG23RQ6F4BVDERBSUM2QYU5WRAPPER5OINANIBJLQ",
  "price": 500000, // 0.05 XLM in stroops
  "created_at": 1705000000,
  "title": "Breaking: Election Results",
  "category": "politics"
}
```

## AccessToken Model

### Structure

```rust
pub struct AccessToken {
    pub reader: Address,         // Reader's Stellar address
    pub article_id: String,      // Article being accessed
    pub publisher: Address,      // Publisher address
    pub price: i128,             // Price paid in stroops
    pub timestamp: u64,          // Issue time (Unix)
    pub expiry: u64,             // Expiry time (24h later)
    pub nonce: u64,              // Replay attack prevention
}
```

### Storage

Access tokens are stored with key combining reader + article:

```
Key:   token:{ reader_address }:{ article_id }
Value: AccessToken { ... }
```

### Validity Rules

Token is valid if:

1. ✅ `current_time <= token.expiry` (not expired)
2. ✅ `token.signature` is valid (cryptographically sound)
3. ✅ `token.reader` matches requester (permission check)
4. ✅ `token.nonce` hasn't been used (replay prevention)

### Lifecycle

```
1. Reader calls purchase_access
    ↓
2. Contract verifies reader authorization
    ↓
3. Contract transfers payment (or verifies externally)
    ↓
4. Contract generates AccessToken with:
   - timestamp = current_time
   - expiry = current_time + 86400 (24 hours)
   - nonce = unique random value
    ↓
5. Token stored in persistent storage
    ↓
6. Token returned to reader
    ↓
7. Reader presents token to backend for verification
    ↓
8. After 24 hours, token automatically invalid
```

### Example

```json
{
  "reader": "GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O",
  "article_id": "politics-2024-election",
  "publisher": "GBUQWP3BOUZX34ULNQG23RQ6F4BVDERBSUM2QYU5WRAPPER5OINANIBJLQ",
  "price": 500000,
  "timestamp": 1705100000,
  "expiry": 1705186400, // +86400 seconds (24 hours)
  "nonce": 1234567890
}
```

## ReadEvent Model

### Structure

```rust
pub struct ReadEvent {
    pub reader: Address,         // Reader's address
    pub article_id: String,      // Article ID
    pub publisher: Address,      // Publisher address
    pub timestamp: u64,          // When read occurred
    pub duration: u32,           // Time in seconds
}
```

### Storage

Read events are stored in analytics maps:

```
Key:   read:{ article_id }:{ timestamp }
Value: ReadEvent { ... }

Or aggregated:

Key:   reads_count:{ article_id }
Value: u32 (total read count)
```

### Lifecycle

```
Reader accesses article
    ↓
Backend verifies token (via contract)
    ↓
Backend sends read event to contract
    ↓
Contract records ReadEvent with:
   - timestamp = current_time
   - duration = (current_time - access_time)
    ↓
Read count incremented for article
    ↓
Analytics data available for querying
```

### Example

```json
{
  "reader": "GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O",
  "article_id": "politics-2024-election",
  "publisher": "GBUQWP3BOUZX34ULNQG23RQ6F4BVDERBSUM2QYU5WRAPPER5OINANIBJLQ",
  "timestamp": 1705100500,
  "duration": 450 // 7.5 minutes
}
```

## Storage Keys

### Naming Convention

All storage keys use prefix pattern:

```
{type}:{identifier1}:{identifier2}

Examples:
- article:politics-2024-election
- token:GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O:politics-2024-election
- read:politics-2024-election:1705100500
- reads_count:politics-2024-election
```

### Key Collisions

To prevent key collisions:

1. Use hierarchical naming (prefix:id:subid)
2. Include unique identifiers (addresses, timestamps)
3. Separate type and content
4. Document storage layout

## Data Consistency

### Atomic Operations

Operations that modify multiple records:

```rust
// Purchase article (atomic):
1. Lock storage
2. Verify article exists
3. Transfer payment (or verify)
4. Create AccessToken
5. Store token
6. Unlock storage
```

If any step fails, entire operation rolls back.

### Invariants

**Article Invariants:**

- Each article has unique ID
- Price always positive
- Publisher is valid address
- created_at is valid timestamp

**Token Invariants:**

- Token expiry > token timestamp
- Reader and publisher are valid addresses
- Nonce is unique (no replay)
- Price matches article price

**ReadEvent Invariants:**

- Timestamp <= current time
- Duration is reasonable (< 24 hours)
- Reader has valid access token

## Queries

### Get Article

```rust
Key: "article:{article_id}"
Returns: Article struct
```

### Get Access Token

```rust
Key: "token:{reader}:{article_id}"
Returns: AccessToken struct or None
```

### Get Article Reads

```rust
Key: "reads_count:{article_id}"
Returns: u32
```

### Get Reader's Tokens

```rust
Pattern: "token:{reader}:*"
Returns: All tokens for reader
```

## Persistence & Durability

### Ledger Storage

Data is stored in Stellar's ledger:

- **Persistent Storage**: Data survives contract upgrades
- **Temporary Storage**: Data expires after archival period
- **Archival**: After ~6 months, data requires fees

### Backup Strategy

For production:

1. Regularly export contract state
2. Store JSON backups off-chain
3. Monitor storage usage
4. Clean expired tokens (optional)

## Performance Considerations

### Storage Costs

| Operation      | Cost    | Notes      |
| -------------- | ------- | ---------- |
| Create Article | 1 entry | ~180 bytes |
| Create Token   | 1 entry | ~200 bytes |
| Record Read    | 1 entry | ~160 bytes |

### Query Patterns

**Fast Queries** (O(1)):

- Get article by ID
- Get token by reader+article
- Get read count

**Expensive Queries** (O(n)):

- Get all articles
- Get all tokens for reader
- Get all reads for period

## Future Enhancements

### Potential Improvements

1. **Pagination**: Handle large result sets
2. **Filtering**: Articles by publisher or category
3. **Bulk Operations**: Register multiple articles
4. **Expiry**: Automatic cleanup of old tokens
5. **Compression**: Reduce storage costs
6. **Versioning**: Support contract upgrades

---

See `CONTRACT_SPEC.md` for function definitions.
See `DEPLOYMENT.md` for deployment procedures.
