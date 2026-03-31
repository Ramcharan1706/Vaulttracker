# Smart Vault - Deployment Guide

Complete guide to deploy Smart Vault production-grade Web3 savings dApp.

## Prerequisites

- Node.js 20+
- Python 3.10+
- AlgoKit CLI
- Algorand wallet (Pera, Defly, or Exodus)
- TestNet ALGO (get from [dispenser](https://testnet.algoexplorer.io/dispenser))

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              Smart Vault Architecture               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  Frontend (React/TypeScript - Instant UI)    │  │
│  │  - Deposit Component                         │  │
│  │  - Withdrawal Component                      │  │
│  │  - Dashboard & Analytics                     │  │
│  │  - Wallet Integration                        │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │ REST API + WebSocket              │
│  ┌──────────────▼───────────────────────────────┐  │
│  │  Backend (Node.js + Express - Sync Engine)   │  │
│  │  - SQLite Cache Layer                        │  │
│  │  - Background Sync (every 3s)                │  │
│  │  - POST /sync/:address endpoint              │  │
│  │  - GET /user/:address (instant)              │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │ Algosdk                          │
│  ┌──────────────▼───────────────────────────────┐  │
│  │  Algorand Network (Source of Truth)          │  │
│  │  - Smart Contract (Savings Vault)            │  │
│  │  - User Local State                          │  │
│  │  - Inner Transactions (Withdrawals)          │  │
│  │  - Indexer (Transaction History)             │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Step 1: Setup

### Clone & Install

```bash
# Navigate to project
cd Vaulttracker

# Install all dependencies
algokit project bootstrap all
```

### Configure Environment

Frontend (`.env` in `projects/Vaulttracker-frontend/`):
```env
VITE_ENVIRONMENT=testnet
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=
VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud
VITE_INDEXER_PORT=443
VITE_INDEXER_TOKEN=
VITE_APP_ID=0  # Will be filled after deployment
VITE_BACKEND_URL=http://localhost:3001
```

Backend (`.env` in `backend/`):
```env
PORT=3001
NODE_ENV=development
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_PORT=443
ALGOD_TOKEN=
INDEXER_SERVER=https://testnet-idx.algonode.cloud
INDEXER_PORT=443
INDEXER_TOKEN=
VITE_APP_ID=0  # Will be filled after deployment
```

## Step 2: Deploy Smart Contract

```bash
cd projects/Vaulttracker-contracts

# Build the contract
algokit project run build

# Deploy to TestNet
algokit project deploy \
  --network testnet \
  --promoter-app-create-txn-signer deployer

# Note the APP_ID from output
```

### Update Configuration

```bash
# Copy APP_ID from deployment output
# Update in both:
# 1. projects/Vaulttracker-frontend/.env (VITE_APP_ID=<ID>)
# 2. backend/.env (VITE_APP_ID=<ID>)
```

## Step 3: Start Backend

```bash
cd backend

# Install dependencies (first time only)
npm install

# Development mode (with file watching)
npm run dev

# OR Production
npm start
```

You should see:
```
🚀 Smart Vault Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server running on http://localhost:3001
🔄 Sync interval: 3000ms
📊 Database: vault.db
```

Verify backend health:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-03-31T10:00:00.000Z",
  "appId": "<YOUR_APP_ID>"
}
```

## Step 4: Start Frontend

In a new terminal:

```bash
cd projects/Vaulttracker-frontend

# Development mode
npm run dev

# Production build
npm run build
npm run preview
```

Frontend will be available at `http://localhost:5173`

## Step 5: Test the Full Flow

### 1. Opt-In

- Connect wallet in UI
- App will detect missing opt-in
- Click "Opt In" button
- Confirm in wallet

### 2. Make a Deposit

- Enter amount (e.g., 1 ALGO)
- Optionally set lock duration
- Click "Deposit ALGO"
- Confirm atomic group in wallet

**Expected flow:**
```
1. Transaction submitted ✓
2. Waiting for confirmation... (typically 5-15s)
3. Backend sync triggered automatically
4. UI updates instantly
5. Streak counter increments
6. Transaction appears in history
```

### 3. Make a Withdrawal

- Enter amount to withdraw
- Click "Withdraw ALGO"
- Confirm in wallet
- Smart contract validates balance
- Inner transaction sends funds to user

**Expected flow:**
```
1. Withdrawal transaction submitted ✓
2. Contract checks lock status
3. Contract validates balance
4. Inner transaction executes
5. Funds arrive in wallet
6. SQLite cache updates
7. UI shows updated balance
```

## Step 6: Production Deployment

### Backend (Heroku/Railway/DigitalOcean)

```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start backend/server.js --name vault-backend

# Configure auto-restart
pm2 startup
pm2 save
```

**With Docker:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
EXPOSE 3001
CMD ["npm", "start"]
```

### Frontend (Vercel/Netlify)

```bash
# Build
npm run build

# Deploy dist/ folder to Vercel/Netlify
```

Update `VITE_BACKEND_URL` to production backend in deploy settings.

## Error Handling

### Common Issues

#### ❌ "App not configured"
**Cause:** `VITE_APP_ID` not set or is 0
**Solution:**
```bash
# Deploy contract first
algokit project deploy

# Update .env with APP_ID
VITE_APP_ID=<actual_id>
```

#### ❌ "Wallet not opted in"
**Cause:** User hasn't opted into the contract
**Solution:** UI will prompt opt-in, click the button

#### ❌ "Unable to extract txId"
**Cause:** Network issue or wallet bug
**Solution:** Retry in a few seconds, check wallet connection

#### ❌ "Insufficient balance"
**Cause:** Contract app account has no ALGO
**Solution:** Fund the app address with 10+ ALGO initial seeding

#### ❌ "Backend sync failed"
**Cause:** Backend not running or network unreachable
**Solution:**
```bash
# Verify backend running
curl http://localhost:3001/health

# Check logs
tail -f backend/server.log
```

## Troubleshooting

### Database Issues

```bash
# Reset SQLite database
rm backend/vault.db

# Backend will recreate schema automatically
npm run dev
```

### Transaction Stuck

```bash
# Check transaction status
curl "https://testnet-idx.algonode.cloud/v2/transactions/<txid>"

# Manually trigger sync
curl -X POST http://localhost:3001/sync/<address>
```

### Backend Crashes

Check for:
1. Database file permissions
2. Port 3001 already in use
3. Network connectivity
4. Memory limits

```bash
# Clear port
lsof -i :3001

# Restart backend
npm run dev  # Will show error details
```

## Performance Tuning

### Frontend
- Cache UI state in Zustand
- Instant SQLite read
- Background sync doesn't block UI

### Backend
- SQLite queries: <10ms
- Blockchain fetch: 1-3s (with retries)
- Indexer queries: 5-10s

### Blockchain
- Deposit: 2-5 rounds
- Withdrawal: 1-3 rounds
- Confirmation: 4-16 seconds typical

## Security Best Practices

1. **Private Keys**
   - Never commit `.env` files
   - Use environment secrets in production

2. **Rate Limiting**
   - Add rate limiter middleware to backend
   - Limit deposits/withdrawals per user

3. **Input Validation**
   - All amounts > 0
   - Address format validation
   - Overflow checks

4. **Contract Security**
   - All state updates validated on-chain
   - Inner transactions properly signed
   - No arbitrary method calls allowed

5. **Backend Security**
   - HTTPS in production
   - CORS properly configured
   - Input sanitization

## Monitoring

### Logs to Check

**Frontend console:**
```
💰 Initiating deposit...
📝 Pending transaction created
✅ Transaction submitted
🔄 Syncing with backend
```

**Backend logs:**
```
🔄 Syncing state for <address>...
✅ Synced user state
📊 Syncing transactions
✅ Synced X transactions
```

### Metrics to Monitor

- Transaction success rate
- Average sync time
- Database size
- Wallet connection errors
- Backend uptime

## Support & Resources

- [Algorand Docs](https://developer.algorand.org/)
- [AlgoKit Docs](https://github.com/algorandfoundation/algokit-cli)
- [SQLite Docs](https://www.sqlite.org/docs.html)
- Project Issues: Check GitHub issues

## Next Steps

After successful deployment:

1. ✅ **Test with real TestNet ALGO**
2. ✅ **Load testing** (multiple users)
3. ✅ **Audit smart contract** (if planning MainNet)
4. ✅ **Monitor performance** for 24+ hours
5. ✅ **Deploy to MainNet** (with updated configuration)

---

**Questions?** Check the main README or open an issue.
