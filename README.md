# 💰 Smart Vault

**Production-Grade Web3 Savings dApp on Algorand**

A hybrid Web3 savings platform combining blockchain security with real-time UI performance through SQLite caching and background syncing.

---

## 🎯 What is Smart Vault?

Smart Vault is a **non-custodial savings application** that:

- 🔐 Secures deposits on Algorand blockchain
- ⚡ Provides instant UI via SQLite cache
- 🎮 Gamifies savings with streaks, XP, and badges
- 💳 Enables atomic deposits and inner-transaction withdrawals
- 📊 Tracks savings goals and milestones
- 🌐 Works with any Algorand-compatible wallet

### Key Features:

| Feature | Description |
|---------|-------------|
| **Atomic Deposits** | 2-transaction atomic group ensures consistency |
| **Inner Txn Withdrawals** | Direct fund transfers without escrow |
| **Streak System** | Bonus XP for consecutive daily deposits |
| **Milestone Badges** | Bronze (10 ALGO), Silver (50), Gold (100) |
| **Time-Lock Option** | Lock funds for specified duration |
| **XP & Levels** | Progression system based on activity |
| **Transaction History** | Complete audit trail on frontend & backend |

---

## 📚 Documentation

### Getting Started:
- **[QUICK_START.md](QUICK_START.md)** - 5-minute setup guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Detailed deployment instructions
- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Complete technical overview

### Testing & Verification:
- **[TESTING_AND_VERIFICATION.md](TESTING_AND_VERIFICATION.md)** - 11 test suites with complete scenarios

### Project Structure:
```
Vaulttracker/
├── backend/                              # Node.js + Express + SQLite
│   ├── server.js                         # API endpoints
│   ├── database.js                       # SQLite schema
│   ├── blockchain.js                     # Algosdk queries
│   └── syncEngine.js                     # Sync + XP calculation
├── projects/
│   ├── Vaulttracker-contracts/          # Algorand smart contract
│   │   └── smart_contracts/vault/contract.py
│   └── Vaulttracker-frontend/           # React + TypeScript frontend
│       └── src/
│           ├── components/              # UI components
│           ├── services/                # API & blockchain services
│           ├── store/                   # Zustand state management
│           └── hooks/                   # Custom React hooks
└── [Documentation files above]
```

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites:
- Node.js 20+
- Python 3.10+
- AlgoKit CLI
- TestNet ALGO (get from [faucet](https://testnet.algoexplorer.io/dispenser))

### Setup:

```bash
# 1. Install dependencies
cd Vaulttracker
algokit project bootstrap all

# 2. Deploy smart contract
cd projects/Vaulttracker-contracts
algokit project deploy --network testnet --promoter-app-create-txn-signer deployer
# => Copy APP_ID from output

# 3. Configure environment
# Edit: projects/Vaulttracker-frontend/.env
VITE_APP_ID=<your-app-id>
VITE_BACKEND_URL=http://localhost:3001

# Edit: backend/.env
VITE_APP_ID=<your-app-id>

# 4. Start backend
cd backend && npm install && npm run dev

# 5. Start frontend (new terminal)
cd projects/Vaulttracker-frontend && npm run dev

# 6. Open http://localhost:5173 ✅
```

**See [QUICK_START.md](QUICK_START.md) for detailed instructions.**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│           Smart Vault Architecture                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Frontend (React)                                   │
│  ├─ Deposit Component                              │
│  ├─ Withdraw Component                             │
│  └─ Dashboard + Analytics                          │
│              │                                      │
│              │ REST API                             │
│              ▼                                      │
│  Backend (Express + SQLite) ◄──── Background Sync  │
│  ├─ POST /sync/:address                           │
│  ├─ GET /user/:address      (instant cache)       │
│  └─ GET /transactions/:address                     │
│              │                                      │
│              │ Algosdk                              │
│              ▼                                      │
│  Algorand Blockchain (Source of Truth)            │
│  ├─ Smart Contract                                 │
│  ├─ User Local State                              │
│  └─ Indexer (transaction history)                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 💾 Smart Contract

**File:** `projects/Vaulttracker-contracts/smart_contracts/vault/contract.py`

### Methods:

```python
opt_in()           # User opts into app
deposit()          # Deposit ALGO (atomic 2-txn group)
withdraw()         # Withdraw via inner transaction
get_user_state()   # Read user vault state
```

### Features:
- ✅ Atomic group validation
- ✅ Streak tracking (24-hour windows)
- ✅ Milestone badges (bitmask)
- ✅ Time-locking mechanism
- ✅ Inner transaction safety

---

## 🗄️ Backend API

### Endpoints:

```bash
# Health check
GET /health

# Sync user state from blockchain to SQLite
POST /sync/:address

# Get cached user state (instant, no blockchain wait)
GET /user/:address

# Get transaction history
GET /transactions/:address

# Get app global state
GET /app/state
```

### Database:
- **users** - User vault state (total_saved, streak, XP, level)
- **transactions** - Deposit/withdrawal history
- **goals** - Savings goals tracking
- **milestones** - Badge tracking

---

## 🎮 Gamification System

### XP Calculation:
```
Base: 10 XP per deposit
Streak: 5 XP × (streak_count - 1)
Total: Deposit XP + Streak bonus
```

### Levels:
```
Level 1:  0-99 XP
Level 2:  100-199 XP
Level 3:  200-299 XP
...
```

### Milestones:
```
🥉 Bronze: ≥ 10 ALGO
🥈 Silver: ≥ 50 ALGO
🥇 Gold:   ≥ 100 ALGO
```

---

## 🧪 Testing

Complete testing guide with 11 test suites:

1. **Environment & Configuration** (3 tests)
2. **Wallet & Connection** (2 tests)
3. **Opt-In Flow** (2 tests)
4. **Deposits** (4 tests)
5. **Withdrawals** (3 tests)
6. **Sync & Cache** (3 tests)
7. **Gamification** (3 tests)
8. **Error Handling** (4 tests)
9. **Data Persistence** (3 tests)
10. **Security** (3 tests)
11. **UI/UX** (3 tests)

**See [TESTING_AND_VERIFICATION.md](TESTING_AND_VERIFICATION.md) for complete scenarios.**

---

## 📊 Data Flow

### Deposit Flow:
1. User enters amount
2. Frontend validates & builds atomic group (2 txns)
3. Wallet signs both transactions
4. Network execution (4-16 seconds)
5. Backend syncs within 3 seconds
6. Frontend updates dashboard instantly

### Withdrawal Flow:
1. User enters amount
2. Smart contract validates balance & lock status
3. Inner transaction sends funds to user wallet
4. Backend tracks in SQLite
5. Frontend reflects withdrawal instantly

---

## 🔒 Security

### Smart Contract:
- ✅ Atomic group validation
- ✅ Amount & sender validation
- ✅ Lock time verification
- ✅ Balance checks before withdrawal
- ✅ Inner transaction safety

### Backend:
- ✅ Input validation
- ✅ Transaction deduplication
- ✅ Database constraints
- ✅ Error handling

### Frontend:
- ✅ Amount validation
- ✅ Wallet opt-in check
- ✅ Group transaction safety
- ✅ Error messaging

---

## 🛠️ Tools & Stack

### Frontend:
- React 18 + TypeScript
- Vite (next-gen build tool)
- Tailwind CSS + Framer Motion
- Zustand (state management)
- use-wallet-react (wallet integration)

### Backend:
- Node.js 20
- Express.js
- better-sqlite3 (SQLite)
- algosdk
- Indexer integration

### Smart Contract:
- Python + PyTeal
- Algorand AVM
- Inner transactions
- Local state tracking

---

## 📖 Additional Resources

- **[Algorand Docs](https://developer.algorand.org/)**
- **[AlgoKit Guide](https://github.com/algorandfoundation/algokit-cli)**
- **[PyTeal Reference](https://pyteal.readthedocs.io/)**
- **[use-wallet Docs](https://txnlab.gitbook.io/use-wallet-react/)**

---

## 🚨 Troubleshooting

### "App not configured"
→ Set `VITE_APP_ID` in `.env` files

### "Wallet not opted in"
→ Click "Opt-In" button, approve in wallet

### "Dashboard doesn't update"
→ Check backend is running, wait 3-5 secs

### "Network timeout"
→ Check internet, try again in 30 secs

**See [TESTING_AND_VERIFICATION.md](TESTING_AND_VERIFICATION.md) for more.**

---

## ✅ Status

🚀 **PRODUCTION READY**

- [x] Smart contract tested
- [x] Atomic deposits working
- [x] Inner transaction withdrawals working
- [x] SQLite cache functional
- [x] Sync engine reliable
- [x] Error handling comprehensive
- [x] UI polished
- [x] Documentation complete

---

## 📝 License

MIT

---

## 📞 Support

For issues or questions:
1. Check [TESTING_AND_VERIFICATION.md](TESTING_AND_VERIFICATION.md) troubleshooting section
2. Review [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) technical details
3. Check backend logs: `cd backend && npm run dev`
4. Check browser console for frontend errors

---

**Last Updated:** March 31, 2026
**Version:** 1.0.0
**Status:** Production-Ready ✅

🎉 **Ready to revolutionize how people save!**
