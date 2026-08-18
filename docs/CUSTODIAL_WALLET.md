# Email-Based Custodial Wallet with Export to Freighter

## Overview

The biggest adoption barrier is requiring Freighter wallet installation. This feature adds **email login** that creates a managed Stellar keypair server-side, enabling purchases without browser extensions. Users can **export to Freighter** anytime for self-custody.

**Impact:** Unlocks 99% of normal readers who don't have Freighter.

## Architecture

```
Reader
  ↓
Login with Email
  ↓
Backend: Derive Keypair from Email Hash
  ↓
Server-Side Storage (encrypted)
  ↓
Purchase signed server-side
  ↓
Banner: "Managed Wallet. Export to Freighter"
  ↓
Export Flow:
  - Generate keypair client-side (fresh)
  - Show secret key with warnings
  - Guide through Freighter import
  - Migrate balance to self-custody
```

## Implementation Phases

### Phase 1: Backend Auth + Custodial Keypairs

- Email login (no password initially - magic link or OTP)
- Derive keypair from email hash (deterministic)
- Store encrypted keypair in DB
- Sign transactions server-side
- Track wallet state per reader

### Phase 2: Reader App UI

- Email login form
- Managed wallet indicator
- "Export to Freighter" button
- Export flow with warnings and guidance

### Phase 3: Export & Migration

- Client-side keypair generation
- Secret key display (with copy/warning)
- Balance transfer from managed → self-custody
- Freighter import instructions

## Security Considerations

⚠️ **This is a trade-off:** We sacrifice ultimate security (self-custody) for **accessibility**. Server-side signing means Byline is a target. Mitigations:

- ✅ Encrypted keypair storage at rest
- ✅ HTTPS transport
- ✅ Rate limiting on sign operations
- ✅ Clear UX about managed vs self-custody
- ✅ Easy, frictionless export path
- ✅ No forced custodial model (users choose)

Users who care about security will export immediately. Users who want frictionless reading won't care. Both win.

## API Endpoints

### POST /auth/signup

Register with email, receive magic link

```json
POST /auth/signup
{ "email": "reader@example.com" }

Response:
{ "success": true, "message": "Check your email for login link" }
```

### POST /auth/verify

Verify magic link or OTP

```json
POST /auth/verify
{ "email": "reader@example.com", "token": "otp_123456" }

Response:
{
  "success": true,
  "sessionToken": "jwt_...",
  "walletAddress": "GABC...",
  "walletType": "managed"
}
```

### POST /auth/login

Direct login (if email already registered)

```json
POST /auth/login
{ "email": "reader@example.com" }

Response:
{ "success": true, "message": "Check your email for login link" }
```

### POST /transactions/sign

Sign a transaction server-side (for managed wallet)

```json
POST /transactions/sign
{
  "sessionToken": "jwt_...",
  "transactionXdr": "AAAAAgA..."
}

Response:
{
  "success": true,
  "signedXdr": "AAAAAgA..."
}
```

### POST /wallet/export-key

Generate and show keypair for export (one-time, shows secret)

```json
POST /wallet/export-key
{
  "sessionToken": "jwt_...",
  "confirm": true  // User confirms they want the secret key
}

Response:
{
  "success": true,
  "publicKey": "GABC...",
  "secretKey": "SBXYZ...",
  "warning": "Save this somewhere secure. Never share it."
}
```

### GET /wallet/status

Get current wallet status

```json
GET /wallet/status?session=jwt_...

Response:
{
  "address": "GABC...",
  "type": "managed",
  "balance": "42.1234",
  "hasExported": false,
  "createdAt": "2024-08-30T12:00:00Z"
}
```

## Database Schema

### Users (email custodial wallets)

```sql
CREATE TABLE custodial_wallets (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,  -- null for magic link auth
  public_key TEXT UNIQUE NOT NULL,
  encrypted_secret_key TEXT NOT NULL,  -- encrypted with server key
  encryption_nonce TEXT NOT NULL,
  wallet_type TEXT CHECK (wallet_type IN ('managed', 'freighter')),
  has_exported BOOLEAN DEFAULT FALSE,
  exported_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_email ON custodial_wallets(email);
CREATE INDEX idx_public_key ON custodial_wallets(public_key);
```

### Sessions

```sql
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES custodial_wallets(id),
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_session_token ON auth_sessions(session_token);
```

### Login Tokens (magic links)

```sql
CREATE TABLE login_tokens (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('magic_link', 'otp')),
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_login_token ON login_tokens(token);
```

## Frontend Flow

### Login Screen

```
┌─────────────────────────────────────┐
│  📖 Byline                          │
├─────────────────────────────────────┤
│                                     │
│  [ ] Have Freighter?                │
│      → [Connect Freighter]          │
│                                     │
│  [ ] New Reader                     │
│      Email: [________________]      │
│      [Sign Up with Email]           │
│                                     │
│  [ ] Already have account           │
│      Email: [________________]      │
│      [Log In]                       │
│                                     │
└─────────────────────────────────────┘
```

### Managed Wallet Indicator

```
┌──────────────────────────────────────────┐
│ ℹ️ Managed Wallet                        │
│ Reading with a Byline-managed wallet.    │
│ Your keys are secure here.               │
│ [Export to Freighter] [Learn More]      │
└──────────────────────────────────────────┘
```

### Export Flow

```
Step 1: Confirmation
  "Export wallet to Freighter?"
  "You'll control your keys. Balance transfers immediately."
  [Cancel] [Continue]

Step 2: Secret Key Display
  ⚠️ "NEVER share this with anyone"
  ⚠️ "Save it in a password manager"

  Stellar Secret Key:
  SBXYZ...

  [Copy]

Step 3: Freighter Setup
  "Open Freighter → Add Account → Enter Secret Key"
  [Open Freighter] [Freighter Instructions]

Step 4: Verify
  "Paste the public key from Freighter:"
  [Input field]
  [Verify & Complete]

Step 5: Success
  ✅ "Wallet exported! You now control your keys."
  "Balance transferred: 42.1234 XLM"
```

## Security & Testing Checklist

- [ ] Encrypted keypair storage (AES-256-GCM)
- [ ] Rate limiting on /auth endpoints
- [ ] Rate limiting on /transactions/sign
- [ ] Secret key never logged
- [ ] Session expiration (24h default)
- [ ] HTTPS-only cookies
- [ ] CSRF protection
- [ ] Input validation & sanitization
- [ ] Magic link one-time use
- [ ] Export confirms public key match
- [ ] Audit logs for key operations
- [ ] Unit tests for crypto operations
- [ ] E2E test: signup → purchase → export → freighter

## Deployment Checklist

- [ ] Environment variable for encryption key (`WALLET_ENCRYPTION_KEY`)
- [ ] Email service configured (SendGrid, Postmark, AWS SES)
- [ ] Database migrations for new tables
- [ ] Session store (Redis or in-process)
- [ ] Rate limiting middleware deployed
- [ ] HTTPS enforced
- [ ] Secrets not in logs
- [ ] Docker image builds
- [ ] CI/CD tests pass
- [ ] Staging environment test

## Phase 2 (Future)

- Multi-factor auth (TOTP, SMS)
- Password option (alongside magic link)
- Device trust/fingerprinting
- Session management UI
- Account recovery flow
- Data export/deletion

## References

- Stellar Keypair generation: https://developers.stellar.org/learn/fundamentals/stellar-data-structures
- Soroban signing: https://docs.rs/soroban-sdk/latest/soroban_sdk/
- Freighter API: https://github.com/stellar/freighter
