# Custodial Wallet Implementation (Phase 1 - Backend)

This document describes the backend implementation of email-based custodial wallets for Byline readers.

## What This Solves

Freighter requirement kills 99% of readers. This feature enables:

- Email signup without any wallet/extension
- Automatic keypair derivation from email
- Server-side transaction signing
- Export to Freighter anytime for self-custody

## Implementation Details

### Services

#### `custodialWalletService.ts`

Manages wallet creation, encryption, and session handling:

- **`deriveKeypairFromEmail(email: string)`** - Deterministically derive a Stellar keypair from email using PBKDF2
- **`encryptSecretKey(secretKey, encryptionKey)`** - Encrypt with AES-256-GCM
- **`decryptSecretKey(encryptedData, encryptionKey)`** - Decrypt secret key
- **`getOrCreateWallet(email)`** - Create or retrieve user wallet
- **`createSession(userId, durationHours)`** - Create auth session
- **`verifySessionToken(token)`** - Validate session
- **`getWalletExportData(email)`** - Get secret key for export (one-time)

#### `emailService.ts`

Handles magic link generation and email delivery:

- **`generateMagicLink(email)`** - Create magic link token
- **`verifyMagicLink(token)`** - Verify and consume token
- **`sendMagicLinkEmail(email, token)`** - Send login link
- **`sendWelcomeEmail(email, publicKey)`** - Send welcome after signup

### Routes

#### `POST /auth/signup`

Register with email.

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"reader@example.com"}'
```

Response:

```json
{
  "success": true,
  "message": "Check your email for a login link",
  "email": "reader@example.com"
}
```

#### `POST /auth/login`

Request magic link for existing account.

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"reader@example.com"}'
```

#### `POST /auth/verify`

Verify magic link token and create session.

```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"<TOKEN_FROM_EMAIL>"}'
```

Response:

```json
{
  "success": true,
  "sessionToken": "jwt_token_here",
  "walletAddress": "GABC...",
  "walletType": "managed",
  "email": "reader@example.com"
}
```

#### `GET /auth/status`

Check current session status.

```bash
curl http://localhost:3000/auth/status \
  -H "Authorization: Bearer <SESSION_TOKEN>"
```

#### `POST /auth/wallet/export-key`

Get secret key for export (with confirmation).

```bash
curl -X POST http://localhost:3000/auth/wallet/export-key \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"confirm":true}'
```

Response:

```json
{
  "success": true,
  "publicKey": "GABC...",
  "secretKey": "SBXYZ...",
  "warning": "NEVER share your secret key. Save it in a password manager."
}
```

#### `POST /auth/logout`

Invalidate session.

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"sessionToken":"<SESSION_TOKEN>"}'
```

## Environment Variables

```env
# Email Configuration
EMAIL_FROM=noreply@byline.app
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=<YOUR_SENDGRID_KEY>

# Wallet Encryption
WALLET_ENCRYPTION_KEY=<64-character hex string>

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Generating Encryption Key

```bash
# Generate a secure 64-character hex key
openssl rand -hex 32
```

## Database Setup

Run the migration to create required tables:

```bash
psql $DATABASE_URL < src/db/migrations/001_add_custodial_wallets.sql
```

Tables created:

- `custodial_wallets` - User wallets with encrypted secret keys
- `auth_sessions` - Active user sessions
- `login_tokens` - Magic links and OTP tokens
- `wallet_audit_log` - Security audit trail

## Security Considerations

### Encryption at Rest

- Secret keys encrypted with AES-256-GCM
- Encryption key must be 64-character hex (32 bytes)
- Unique IV for each encryption

### Session Management

- Sessions expire after 24 hours
- One-time magic link tokens (15 minute expiry)
- Sessions tied to user ID, not just token
- IP/user-agent logged (optional fingerprinting)

### Rate Limiting

- 5 login attempts per 15 minutes
- 10 signup attempts per hour

### Audit Trail

- All key operations logged in `wallet_audit_log`
- IP address and user-agent recorded

## Testing

Run the unit tests:

```bash
npm run test custodialWalletService.test.ts
```

Tests cover:

- Deterministic keypair derivation from email
- Encryption/decryption roundtrip
- Invalid encryption key handling
- Different keypairs for different emails

## Integration with Reader App

Phase 2 will connect these endpoints to the reader app:

- Email login form
- Magic link verification
- Session storage
- Managed wallet indicator
- Export flow

## Next Steps (Phase 2)

1. **Frontend**: Add email login UI to reader app
2. **Transaction Signing**: Implement `/transactions/sign` endpoint
3. **Export Flow**: Build client-side key generation and export UI
4. **Integration Tests**: E2E test signup → purchase → export

## Deployment Checklist

- [ ] `WALLET_ENCRYPTION_KEY` set in production
- [ ] Email service configured (SendGrid/Postmark/SES)
- [ ] Database migrations applied
- [ ] HTTPS enforced
- [ ] Rate limiting configured
- [ ] CORS settings verified
- [ ] Session store (Redis or in-process)
- [ ] Logs do not contain secret keys
- [ ] Audit trail enabled
- [ ] Docker image built and tested
- [ ] CI/CD tests passing

## References

- [Stellar Keypair Generation](https://developers.stellar.org/learn/fundamentals/stellar-data-structures)
- [PBKDF2 Key Derivation](https://en.wikipedia.org/wiki/PBKDF2)
- [AES-256-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [Magic Link Auth Pattern](https://pragmaticwebsecurity.com/files/email-auth-whitepaper.pdf)
