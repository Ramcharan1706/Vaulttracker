# Smart Vault - Quick Start Guide

Get Smart Vault running in <10 minutes.

## Prerequisites

- ✅ Node.js 20+
- ✅ Python 3.10+
- ✅ AlgoKit installed: `brew install algorandfoundation/algokit/algokit` (macOS) or [here](https://algorandfoundation.github.io/algokit-cli/)
- ✅ TestNet ALGO: Get from [faucet](https://testnet.algoexplorer.io/dispenser)

## 🚀 5-Minute Start

### 1. Clone & Setup (1 min)

```bash
cd Vaulttracker

# Install everything
algokit project bootstrap all
```

### 2. Deploy Smart Contract (2 min)

```bash
cd projects/Vaulttracker-contracts

# Build & deploy
algokit project deploy --network testnet --promoter-app-create-txn-signer deployer
```

**Copy the APP_ID from output** (looks like: `APP_ID=1234567890`)

### 3. Update Configuration (0.5 min)

Update with your APP_ID:

**File: `projects/Vaulttracker-frontend/.env`**
```env
VITE_APP_ID=1234567890  # Your APP_ID from step 2
VITE_BACKEND_URL=http://localhost:3001
```

**File: `backend/.env`**
```env
VITE_APP_ID=1234567890  # Same APP_ID
```

### 4. Start Backend (1 min)

```bash
cd backend
npm install  # First time only
npm run dev
```

**Expected output:**
```
🚀 Smart Vault Backend
📡 Server running on http://localhost:3001
```

✅ Backend ready!

### 5. Start Frontend (0.5 min)

New terminal:

```bash
cd projects/Vaulttracker-frontend
npm run dev
```

**Open:** `http://localhost:5173`

✅ **You're live!**

---

## ✅ First Transaction

### 1. Connect Wallet

- Click "Connect Wallet"
- Select wallet (Pera, Defly, etc.)
- Approve in wallet

### 2. Opt-In (One-time)

- App will prompt opt-in
- Click button in UI
- Confirm in wallet

### 3. Make Deposit

- Enter: `1 ALGO`
- Click: "Deposit ALGO"
- Confirm: Atomic group (2 transactions)
- **Wait:** 4-16 seconds for confirmation

**Result:** ✅ 1 ALGO saved, streak +1, XP gained

### 4. Make Withdrawal

- Enter: `0.5 ALGO`
- Click: "Withdraw ALGO"
- Confirm in wallet
- **Wait:** 4-12 seconds

**Result:** ✅ 0.5 ALGO received, balance updated instantly

---

## 🐛 Troubleshooting

### Issue: "App ID not set"

```bash
# Redeploy if needed
cd projects/Vaulttracker-contracts
algokit project deploy --network testnet --promoter-app-create-txn-signer deployer

# Copy APP_ID and update both .env files
```

### Issue: "Wallet not opted in"

- App automatically prompts opt-in
- Click the button if you see the error

### Issue: Backend not responding

```bash
# Check health
curl http://localhost:3001/health

# Should return:
# {"status":"ok",...}

# If error, restart backend:
cd backend
npm run dev
```

### Issue: Slow confirmation

- Network can be slow on testnet
- Wait 15+ seconds
- Check [Algoexplorer](https://testnet.algoexplorer.io/) for TX status

### Issue: Can't connect wallet

- Refresh page
- Ensure wallet is installed
- Check if you're on testnet in wallet settings

---

## 📊 Verify Everything Works

### Check Sync

After deposit, look for in browser console:
```
✅ Synced user state:
   Total Saved: 1 ALGO
   Streak: 1
```

### Check Backend

```bash
# Get user state
curl http://localhost:3001/user/<your-address>

# Should return:
# {"address":"...","totalSaved":1000000,"streakCount":1,...}
```

### Check Database

```bash
# List transactions
sqlite3 backend/vault.db "SELECT * FROM transactions LIMIT 1;"

# List users
sqlite3 backend/vault.db "SELECT address, total_saved FROM users;"
```

---

## 🎮 What to Test

1. ✅ **Multiple deposits** - Streak should increment
2. ✅ **Time-locked deposit** - Select "1 Week" lock
3. ✅ **Partial withdrawal** - Withdraw half your balance
4. ✅ **Full withdrawal** - Withdraw everything
5. ✅ **Transaction history** - See all transactions
6. ✅ **Streak tracking** - Day counter visible
7. ✅ **Level progression** - XP points accumulating
8. ✅ **Milestones** - Badges appear at thresholds (10/50/100 ALGO)

---

## 📁 Project Structure

```
Vaulttracker/
├── projects/
│   ├── Vaulttracker-contracts/    # Smart contract (Python/Algopy)
│   └── Vaulttracker-frontend/     # React UI + wallet integration
├── backend/                        # Node.js sync engine + SQLite
├── DEPLOYMENT.md                   # Full deployment guide
├── ARCHITECTURE.md                 # Technical deep-dive
└── README.md                       # Project overview
```

---

## 📚 Project Capabilities

| Feature | Status | How to Use |
|---------|--------|-----------|
| Deposits | ✅ | Enter amount, set lock (optional) |
| Atomic Groups | ✅ | Automatic, 2-txn deposit |
| Withdrawals | ✅ | Enter amount, confirm |
| Inner Transactions | ✅ | Automatic in smart contract |
| Streak Tracking | ✅ | Increments on daily deposits |
| Lock Status | ✅ | Shows in UI if funds locked |
| XP + Levels | ✅ | Earned on transactions |
| Milestones/Badges | ✅ | Unlocked at 10/50/100 ALGO |
| Transaction History | ✅ | See timeline of all TXs |
| Instant UI | ✅ | Backend sync <5s |
| Background Sync | ✅ | Every 3 seconds |

---

## 🔐 Security Notes

This is a production-ready codebase. Before MainNet:

1. ✅ **Contract audited** - Review for vulnerabilities
2. ✅ **Test extensively** - Try edge cases
3. ✅ **Rate limiting** - Add if high volume expected
4. ✅ **Environment secrets** - Use proper secret management
5. ✅ **HTTPS** - Deploy backend over HTTPS
6. ✅ **Contract verification** - TestNet throughly before MainNet

---

## 📞 Support

- **Stuck?** Check browser console (F12)
- **Backend issues?** Check `backend/` logs
- **Contract questions?** See `ARCHITECTURE.md`
- **Deployment?** See `DEPLOYMENT.md`

---

## 🎉 Next Steps

1. ✅ Make some test deposits/withdrawals
2. ✅ Verify backend sync is working
3. ✅ Understand the architecture (see ARCHITECTURE.md)
4. ✅ Deploy to production (see DEPLOYMENT.md)
5. ✅ Monitor and iterate

**Congrats! You're running a production Web3 savings dApp!** 🚀

---

Need help? Open an issue or check docs in each folder.
