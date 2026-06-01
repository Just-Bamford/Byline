# Byline Protocol Specification

## Overview

Byline is a decentralized micropayment protocol for digital journalism. Readers pay fractions of a cent per article, publishers receive instant settlement on Stellar.

## Core Concepts

### Access Token

An access token is a cryptographic proof that a reader has paid for access to an article. It contains:

- `reader`: Reader's Stellar address
- `article_id`: Unique article identifier
- `price`: Amount paid (in stroops, 1 XLM = 10,000,000 stroops)
- `timestamp`: Token creation time
- `expiry`: Token expiration time (typically 24 hours)

### Payment Flow

1. **Reader initiates purchase**
   - Calls `purchase_access()` on Soroban contract
   - Specifies article ID and publisher address
   - Contract verifies reader has sufficient balance

2. **Contract processes payment**
   - Deducts price from reader's wallet
   - Transfers funds to publisher
   - Issues access token

3. **Publisher validates token**
   - Receives token from reader
   - Calls verification service
   - Service queries contract to confirm token validity
   - Serves article content if valid

4. **Revenue settles**
   - Funds are immediately available in publisher's wallet
   - No intermediary, no settlement delay

## Smart Contract Interface

### `initialize(admin, token)`

Initialize contract with admin address and token contract address.

### `purchase_access(reader, article_id, price, publisher) -> AccessToken`

Purchase access to an article. Requires reader authorization.

### `verify_token(token) -> bool`

Verify an access token is valid and not expired.

### `get_article_price(article_id) -> i128`

Get the current price for an article.

### `set_article_price(article_id, price, publisher)`

Set article price. Requires publisher authorization.

## Security Considerations

### Token Replay Prevention

- Tokens are single-use or time-bound
- Verification service tracks used tokens
- Expired tokens are automatically invalid

### Access Control

- Reader must authorize payment transaction
- Publisher must authorize price changes
- Contract validates all signatures

### Rate Limiting

- Prevent bot farms from generating fake reads
- Implement per-IP and per-wallet read limits
- Monitor for suspicious patterns

## Integration Guide

### For Publishers

1. Deploy Byline Publisher SDK
2. Call `verifyToken()` before serving content
3. Record reads via analytics service
4. Monitor earnings via dashboard

### For Readers

1. Create wallet via email login
2. Top up with fiat or XLM
3. Click article to purchase access
4. Token automatically validated and stored

## Pricing Model

- Minimum article price: $0.001
- Publishers set their own prices
- Prices denominated in USD (converted to USDC on Stellar)
- No protocol fees (open source)

## Future Enhancements

- Revenue sharing (split between writers, editors, publishers)
- Subscription tiers (unlimited reads for fixed price)
- Recommendation engine
- Cross-publisher analytics
- Multi-chain support
