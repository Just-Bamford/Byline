# End-to-End Payment Flow

## Complete Payment Lifecycle

This document describes the full payment flow from reader purchase through publisher earnings.

## Flow Diagram

```
Reader App
    ↓
1. Reader clicks "Buy Article"
    ↓
2. Reader confirms purchase
    ↓
3. Sign transaction with wallet
    ↓
Smart Contract (Stellar)
    ↓
4. Verify reader has balance
    ↓
5. Transfer payment to publisher escrow
    ↓
6. Generate access token with signature
    ↓
7. Return token to reader
    ↓
Reader App
    ↓
8. Store token in localStorage
    ↓
9. POST /record-read to backend
    ↓
Publisher Backend
    ↓
10. Verify token signature
    ↓
11. Verify token not expired
    ↓
12. Verify token not replayed
    ↓
13. Update analytics
    ↓
14. Record read event
    ↓
15. Update publisher earnings
    ↓
16. Return 200 OK to reader
    ↓
Reader App
    ↓
17. Display article content
    ↓
18. Track read duration
    ↓
End: Article access granted ✓
```

## Step-by-Step Breakdown

### Phase 1: Reader Initiation (Reader App)

**Step 1-3: Purchase Intent**

- Reader views article card with price
- Reader clicks "Buy" button
- App shows confirmation dialog with price
- Reader confirms purchase (or cancels)

**Data exchanged:**

```json
{
  "articleId": "article-123",
  "price": 0.002,
  "publisherAddress": "GBUQWP3..."
}
```

### Phase 2: Contract Execution (Smart Contract)

**Step 4-7: Payment & Token Generation**

1. **Balance Check**
   - Verify reader has sufficient balance (price + buffer)
   - If insufficient, reject transaction

2. **Payment Transfer**
   - Transfer `price` stroops from reader to publisher escrow
   - Ensure atomic transaction (all or nothing)

3. **Token Generation**
   - Create AccessToken with:
     - `reader`: reader's address
     - `article_id`: article being purchased
     - `price`: amount paid
     - `timestamp`: current time
     - `expiry`: timestamp + 24 hours
     - `nonce`: unique random value (prevents replay)

4. **Token Signature**
   - Sign token with contract's key
   - Include signature in returned token

5. **Return to Reader**
   - Return token with signature to reader app

**Contract state changes:**

```rust
Token {
  reader: "GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O",
  article_id: "article-123",
  publisher: "GBUQWP3BOUZX34ULNQG23RQ6F4BVDERBSUM2QYU5WRAPPER5OINANIBJLQ",
  price: 200000,  // stroops
  timestamp: 1705100000,
  expiry: 1705186400,  // +24 hours
  nonce: 1234567890,
  signature: "..."
}
```

### Phase 3: Backend Verification (Publisher Backend)

**Step 9-15: Verification & Analytics**

1. **Receive Read Event**
   - Reader app POSTs /record-read with:
     - articleId
     - readerId
     - token object

2. **Token Validation Chain**

   a. **Signature Verification**

   ```
   - Extract signature from token
   - Reconstruct token data
   - Verify signature matches
   - If fails → 403 Forbidden
   ```

   b. **Expiry Check**

   ```
   - Compare token.expiry > current_time
   - If expired → 403 Forbidden
   ```

   c. **Replay Prevention**

   ```
   - Check if nonce already used
   - If used → 403 Forbidden
   - Mark nonce as used
   ```

   d. **Contract Query** (Optional)

   ```
   - Query contract: verify_token(reader, article_id)
   - If contract says invalid → 403 Forbidden
   ```

3. **Analytics Recording**
   - Create ReadEvent:
     ```json
     {
       "articleId": "article-123",
       "readerId": "GBQCEJBGX5XNNXKHWVWPNZ3EXIPY3GBDKWQKFQ5QGBP2J4VKQCN5Q2O",
       "price": 0.002,
       "timestamp": 1705100000,
       "duration": 300 // seconds
     }
     ```

4. **Earnings Update**
   - Add price to article's total revenue
   - Update publisher's total earnings
   - Increment read count

5. **Response**
   - Return 200 OK with:
     ```json
     {
       "success": true,
       "recordedAt": 1705100000,
       "articleId": "article-123"
     }
     ```

### Phase 4: Reader Display (Reader App)

**Step 17-18: Content Display**

1. **Verify Access**
   - Check token exists in localStorage
   - Check token not expired locally
   - Verify signature locally (cached)

2. **Display Content**
   - Render full article content
   - Show article metadata
   - Enable sharing/bookmarking

3. **Track Engagement**
   - Record read start time
   - Track scroll depth
   - Measure time on page
   - Record any interactions

4. **End Session**
   - On page leave, calculate duration
   - Optionally update backend with engagement data

## Error Handling

### Reader-Side Errors

| Error                | Cause                  | Recovery                  |
| -------------------- | ---------------------- | ------------------------- |
| Insufficient balance | Reader has < price XLM | Prompt to top up          |
| Transaction timeout  | Contract slow          | Retry with longer timeout |
| Token not received   | Network error          | Retry purchase            |
| Token invalid        | Signature mismatch     | Purchase again            |

### Backend-Side Errors

| Error                 | Cause                          | Response           |
| --------------------- | ------------------------------ | ------------------ |
| 400 Bad Request       | Missing required fields        | Check payload      |
| 401 Unauthorized      | No token provided              | Provide token      |
| 403 Forbidden         | Token invalid/expired/replayed | Purchase new token |
| 429 Too Many Requests | Rate limited                   | Retry after delay  |
| 500 Server Error      | Backend issue                  | Retry later        |

## Security Measures

### Payment Phase

✅ Reader requires auth (wallet keypair)
✅ Contract validates balance
✅ Atomic token generation
✅ Signature-based token

### Verification Phase

✅ Signature verification
✅ Expiry checking
✅ Replay attack prevention (nonce)
✅ Request validation
✅ Rate limiting

### Data Protection

✅ Tokens stored in localStorage (browser-sandboxed)
✅ Sensitive data not logged
✅ HTTPS-only in production
✅ CORS restrictions

## Performance Optimization

### Caching

**Client-side:**

- Cache token validity for 5 minutes
- Cache article metadata

**Server-side:**

- Cache earnings for 5 minutes
- Cache top articles for 1 hour
- Cache article stats for 10 minutes

### Async Operations

- Record read events asynchronously
- Don't block article display on analytics
- Batch analytics writes if possible

## Monitoring

### Metrics to Track

1. **Purchase Success Rate**
   - Transactions completed / initiated

2. **Token Validation Rate**
   - Valid tokens / total verifications

3. **Error Rate by Type**
   - Track failures at each phase

4. **Latency**
   - Contract execution time
   - Backend verification time
   - End-to-end flow time

### Alerts

- Purchase success rate < 95%
- Token validation failure > 5%
- Backend latency > 1 second
- Contract errors

## Testing Checklist

- [ ] Happy path: Purchase → Verify → Display
- [ ] Expired token rejection
- [ ] Replay attack prevention
- [ ] Insufficient balance handling
- [ ] Network timeout recovery
- [ ] Rate limiting enforcement
- [ ] Analytics recording accuracy
- [ ] Earnings calculation correctness

## Deployment Checklist

Before deploying to production:

- [ ] Contract audited
- [ ] Backend security review
- [ ] Load tested (1000 concurrent users)
- [ ] Backup and recovery tested
- [ ] Monitoring and alerts configured
- [ ] Incident response plan ready
- [ ] User documentation complete
- [ ] Support team trained
