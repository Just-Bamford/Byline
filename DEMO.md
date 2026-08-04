# Byline Demo Guide

## 📹 Live Demo Flow

This guide walks through the complete Byline experience end-to-end. Follow along or record this as a GIF/video for reviewers.

---

## Prerequisites

- **Freighter Wallet** - Browser extension (https://freighter.app)
- **Testnet XLM** - Fund via Friendbot: https://friendbot.stellar.org
- **Reader App** - Running locally at `http://localhost:5173`
- **Backend API** - Running at `http://localhost:3000`

### Quick Setup

```bash
# Terminal 1: Start Backend
cd publisher-backend
npm install
npm run dev

# Terminal 2: Start Reader App
cd reader-app
npm install
npm run dev

# Terminal 3: Deploy Contract (Optional - see TESTNET.md)
cd contract
cargo build --target wasm32-unknown-unknown --release
soroban contract deploy --source testnet --network testnet
```

---

## Demo Walkthrough (5 minutes)

### Step 1: Open Reader App

Navigate to http://localhost:5173

You should see:

- **Header** with "Connect Wallet" button
- **Article Grid** showing 3 sample articles
- Each article has a price (e.g., 0.001 XLM)

**Screenshot:** Articles grid with prices

---

### Step 2: Connect Freighter Wallet

1. Click **"🔗 Connect Wallet"** in header
2. Freighter popup appears asking for permission
3. Click **"Approve"** in Freighter
4. Wallet connects — you see your public key in header
5. Status message: **"✓ Wallet connected!"**

**Expected:** Wallet address appears in header, button changes to show address

**Screenshot:** Connected wallet header with address

---

### Step 3: Get Testnet XLM

1. Click **"💰 Top Up"** button (if balance is 0)
2. Enter amount (e.g., 10 XLM)
3. Click **"Fund Testnet Wallet"**
4. Wait 3-5 seconds
5. Status: **"✓ Funded with 10,000 testnet XLM"**
6. Balance updates in header

**Expected:** Balance goes from 0 → 10 XLM

**Screenshot:** Funded wallet with balance

---

### Step 4: Browse Articles

Articles are displayed in a grid:

1. **Article 1** - "The Future of Decentralised Media" - 0.001 XLM (unlocked demo)
2. **Article 2** - "Stellar's Role in African Fintech" - 0.002 XLM (locked)
3. **Article 3** - "Soroban Smart Contracts" - 0.003 XLM (locked)

Each card shows:

- Title
- Author
- Excerpt
- Price in XLM
- Category badge
- Button: "✓ Read" (if unlocked) or "🛒 Buy" (if locked)

**Screenshot:** Article cards in grid

---

### Step 5: Purchase Article Access

1. Click **"🛒 Buy for 0.002 XLM"** on Article 2
2. Confirmation dialog: _"Purchase 'Stellar's Role in African Fintech' for 0.002 XLM?"_
3. Click **"OK"**
4. Button changes to **"⏳ Processing..."**
5. Wait 5-10 seconds (Freighter signs transaction)
6. Freighter popup appears — click **"Sign"**
7. Transaction submitted
8. Button changes to **"✓ Access purchased on Stellar testnet"**
9. Balance updates: 10 XLM → 9.998 XLM
10. Status message: **"✓ Access granted! Tx: abc123def456..."**

**Expected:**

- Button changes to "✓ Read" after purchase
- Balance decreases by purchase amount
- Article becomes unlocked

**Screenshot:** Purchase confirmation and tx hash

---

### Step 6: Read Article

1. Click **"📖 Read"** button on unlocked article
2. Modal opens showing:
   - Article title
   - Author name
   - Publish date
   - Read time
   - **✓ Access purchased on Stellar testnet** (green banner)
   - Full article content with:
     - Intro paragraph (bold, larger)
     - H2 headings
     - Body paragraphs
     - Bullet lists
3. Scroll through article
4. Click **"✕"** to close

**Expected:**

- Full article content displays
- Green confirmation banner shows purchase
- Professional typography

**Screenshot:** Article reading view with content

---

### Step 7: View Transaction on Stellar Expert

After purchase, check transaction on-chain:

1. From status message, copy transaction hash (or use browser console)
2. Go to **Stellar Expert Testnet:** https://testnet.stellar.expert
3. Paste TX hash in search
4. View complete transaction details:
   - Operations
   - Fee (0.00001 XLM)
   - Timestamp
   - Sender/receiver

**Expected:**

- Transaction visible with correct amount
- Fee is sub-cent (0.00001 XLM)
- Settlement time ~5 seconds

**Screenshot:** Transaction on Stellar Expert

---

### Step 8: Check Backend Analytics (Optional)

Backend is tracking reads. Check:

```bash
# Terminal: Query backend analytics
curl http://localhost:3000/earnings

# Response example:
{
  "total": 0.005,
  "pending": 0,
  "settled": 0.005,
  "txCount": 2,
  "avgPrice": 0.0025
}
```

**Expected:**

- Total earnings reflect purchases
- Individual article stats available at `/articles/:id/stats`

---

## Recording This as a GIF/Video

### Tools

**GIF:**

- **ScreenToGif** (Windows) - https://www.screentogif.com
- **LiceCap** (Mac/Windows) - http://www.cockos.com/licecap
- **Peek** (Linux) - https://github.com/phw/peek

**Video:**

- **OBS Studio** (free, cross-platform) - https://obsproject.com
- **Loom** (free, browser) - https://www.loom.com

### Recording Tips

1. **Resolution:** 1920x1080 (or 1280x720)
2. **Duration:** 60 seconds max
3. **Narration:** Optional (background music is fine)
4. **Pacing:** Show each step clearly, don't rush
5. **Focus:** Full screen + wallet activity

### Loom Quick Recording (Easiest)

1. Go to https://www.loom.com
2. Click **"Start for free"** → Sign up
3. Click **"Start recording"**
4. Select browser window or full screen
5. Follow demo walkthrough above
6. Stop recording
7. Copy shareable link
8. Paste in README

---

## Demo Checklist

✅ Freighter installed and testnet account created  
✅ Backend running on `http://localhost:3000`  
✅ Reader app running on `http://localhost:5173`  
✅ Testnet wallet has XLM balance  
✅ Article cards display with prices  
✅ Purchase flow completes without errors  
✅ Transaction visible on Stellar Expert  
✅ Article content displays after purchase  
✅ Balance decrements correctly  
✅ Recording captured (60 sec GIF or video)

---

## Troubleshooting

### "Freighter not found"

**Issue:** Browser extension not installed or not enabled

**Fix:**

1. Install Freighter: https://freighter.app
2. Restart browser
3. Click Freighter icon in top-right
4. Verify extension is enabled

### "Insufficient balance"

**Issue:** Testnet wallet has 0 XLM

**Fix:**

1. Fund via Friendbot:
   ```bash
   curl "https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY"
   ```
2. Wait 10 seconds
3. Refresh app and check balance

### "Purchase fails with error"

**Issue:** Backend or contract not responding

**Fix:**

1. Check backend is running: `npm run dev` in `publisher-backend/`
2. Check contract deployed to testnet
3. Verify `.env` files have correct contract ID
4. Check browser console for error details

### "Transaction takes >30 seconds"

**Issue:** Testnet is congested or Freighter is slow to sign

**Fix:**

1. Wait up to 1 minute
2. Check Stellar Expert to see if tx went through
3. Try again with smaller amount

---

## Next Steps After Demo

1. **Share the GIF/video** in README and GitHub discussions
2. **Link Stellar Expert tx** in TESTNET.md
3. **Deploy to live testnet** (see TESTNET.md)
4. **Deploy reader app to Vercel** (2 min) - https://vercel.com
5. **Deploy backend to Railway** (5 min) - https://railway.app
6. **Update README** with live deployment links

---

## Live Demo (Coming Soon)

Once deployed to cloud:

- **Reader App:** https://byline-reader.vercel.app
- **Contract ID:** Will be updated here
- **Example Transaction:** Link to real tx on Stellar Expert

---

## Questions?

Open an issue in the repository or reach out on GitHub Discussions.

Last Updated: August 4, 2026
