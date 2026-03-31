# Smart Vault - Testing & Verification Guide

Complete guide to test and verify all Smart Vault features: deposits, withdrawals, syncing, and gamification.

---

## 📋 Prerequisites

Before testing, ensure you have:

- ✅ **Smart contract deployed** (APP_ID configured in both `.env` files)
- ✅ **Backend running** on `http://localhost:3001`
- ✅ **Frontend running** on `http://localhost:5173`
- ✅ **TestNet ALGO** in your wallet (>2 ALGO)
- ✅ **Wallet connected** (Pera, Defly, or Exodus)

---

## 🧪 Test Suite 1: Environment & Configuration

### Test 1.1: Verify Backend Health

```bash
# Terminal: Check backend is running
curl http://localhost:3001/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-03-31T12:00:00.000Z",
  "appId": "1234567890"
}
```

**✅ PASS** if you get the response above.

### Test 1.2: Verify Frontend Environment

Open browser console (`F12`) and check for errors:

```javascript
// In browser console:
console.log(import.meta.env.VITE_APP_ID)        // Should print APP_ID
console.log(import.meta.env.VITE_BACKEND_URL)   // Should print backend URL
```

**✅ PASS** if both values print correctly (not "0" or "undefined").

### Test 1.3: Verify Database Initialization

```bash
# Check if backend created vault.db
ls -la backend/vault.db

# Expected:
# -rw-r--r--  1 user  group  ... backend/vault.db
```

**✅ PASS** if `vault.db` file exists.

---

## 💳 Test Suite 2: Wallet & Connection

### Test 2.1: Wallet Connection

1. Open frontend in browser
2. Click **"Connect Wallet"** button
3. Select wallet (Pera, Defly, Exodus)
4. Approve connection in wallet app

**✅ PASS** if:
- Wallet shows as connected
- Address displays (shortened)
- State updates instantly

### Test 2.2: Wallet Disconnect

1. Click wallet address in header
2. Select **"Disconnect"**

**✅ PASS** if:
- Wallet disconnects
- Dashboard shows "Please connect wallet"
- All buttons are disabled

---

## 🔑 Test Suite 3: Opt-In Flow

### Test 3.1: First-Time Opt-In

1. Connect wallet (Test 2.1)
2. Look for "Opt-In Required" message
3. Click **"Opt-In to Vault"** button
4. Approve in wallet

**✅ PASS** if:
- Transaction succeeds
- Message disappears
- Deposit button becomes active

### Test 3.2: Opt-In Persistence

1. Refresh page (`F5`)
2. Wallet should still be connected
3. No opt-in prompt should appear

**✅ PASS** if opt-in is remembered.

---

## 💰 Test Suite 4: Deposit Functionality

### Test 4.1: Basic Deposit (1 ALGO)

1. Go to **"Deposit"** section
2. Enter: `1` in amount field
3. Click **"Deposit ALGO"** button
4. Review atomic group details (should show 2 transactions)
5. Approve in wallet

**Expected flow:**
- Transaction appears in console with grouped transaction details
- Wallet shows 2 transactions to sign
- Success notification appears
- Dashboard instantly updates with new total

**✅ PASS** if all checks pass.

### Test 4.2: Deposit with Different Amounts

Repeat Test 4.1 with different amounts:
- `0.5 ALGO` (should work)
- `10 ALGO` (should work if balance sufficient)
- `0` ALGO (should fail with error message)
- `-1` ALGO (should fail with error message)

**✅ PASS** if valid amounts succeed and invalid amounts show appropriate errors.

### Test 4.3: Deposit Multiple Times (Streak Test)

1. Deposit `1 ALGO`
2. Wait for confirmation
3. Dashboard should show `Streak: 1`
4. Deposit again `1 ALGO` (within 24 hours)
5. Dashboard should update to `Streak: 2`

**✅ PASS** if streak increments with each deposit.

### Test 4.4: Transaction History Update

After any deposit:

1. Go to **"Transactions"** section
2. Check if transaction appears in list
3. Verify `Type: deposit` and correct amount

**✅ PASS** if transaction appears within 5 seconds.

---

## 🏦 Test Suite 5: Withdrawal Functionality

### Test 5.1: Basic Withdrawal (0.5 ALGO)

1. Go to **"Withdraw"** section
2. Click **"Max"** button (or enter `0.5`)
3. Click **"Withdraw ALGO"** button
4. Approve in wallet

**Expected flow:**
- Single app call transaction (different from deposit)
- Shows inner transaction details
- Funds sent to your wallet
- Dashboard total_saved decreases

**✅ PASS** if withdrawal succeeds and balance updates.

### Test 5.2: Withdrawal Edge Cases

Test the following scenarios:

#### Scenario A: Over-Withdraw
1. Try to withdraw MORE than total saved
2. Should show error: "Cannot withdraw more than total_saved"

**✅ PASS** if error prevents transaction.

#### Scenario B: Insufficient Balance in Contract
If app account runs low:
1. Withdrawal should fail with: "Insufficient balance"

**✅ PASS** if error detected.

#### Scenario C: Zero Withdrawal
1. Try to enter `0` ALGO
2. Should show error: "Withdrawal amount must be > 0"

**✅ PASS** if validation prevents transaction.

### Test 5.3: Withdrawal After Locked Period

If you deposited with a lock duration:

1. Try immediate withdrawal (should fail)
2. Wait for lock duration to expire
3. Withdrawal should succeed

**✅ PASS** if lock validation works.

---

## 🔄 Test Suite 6: Sync & Cache Verification

### Test 6.1: Immediate Sync After Deposit

1. Go to backend logs
2. Make a deposit
3. Observe in backend logs:

```
🔄 Sync request for <address>
✅ Synced user state:
   Total Saved: X ALGO
   Streak: Y
```

**✅ PASS** if sync happens within 2 seconds.

### Test 6.2: SQLite Cache Population

1. Stop backend (`Ctrl+C`)
2. Check `backend/vault.db`:

```bash
sqlite3 backend/vault.db "SELECT address, total_saved, streak_count FROM users LIMIT 1;"

# Expected output:
# T3LVQK...|3000000|2
```

**✅ PASS** if data is present and values match frontend display.

### Test 6.3: Background Sync

1. Deposit on one device/wallet
2. Check frontend on another browser
3. Frontend should update within 30 seconds

**✅ PASS** if data syncs across sessions.

---

## 🎮 Test Suite 7: Gamification System

### Test 7.1: XP Calculation

1. Make first deposit: `1 ALGO`
2. Dashboard should show `10 XP` (base deposit XP)
3. After depositing again within 24h: `Streak 2`
4. Dashboard should show `10 + 10 + 5 = 25 XP` (deposits + streak bonus)

**✅ PASS** if XP matches formula.

### Test 7.2: Level Calculation

XP to Level mapping:
- 0-99 XP = Level 1
- 100-199 XP = Level 2
- 200+ XP = Level 3

**Test:**
1. Make deposits until XP reaches 100
2. Level should change to 2

**✅ PASS** if level updates correctly.

### Test 7.3: Milestone Badges

Thresholds:
- Bronze: >= 10 ALGO
- Silver: >= 50 ALGO
- Gold: >= 100 ALGO

**Test:**
1. Deposit until total >= 10 ALGO
2. Dashboard should show Bronze badge
3. Continue depositing to unlock Silver and Gold

**✅ PASS** if badges appear at correct thresholds.

---

## 🚨 Test Suite 8: Error Handling

### Test 8.1: Wallet Rejection

1. Click "Deposit ALGO"
2. **Reject** transaction in wallet
3. Should show: "Transaction was cancelled in your wallet"

**✅ PASS** if error message displays.

### Test 8.2: Insufficient Balance

1. Copy your address
2. Send all ALGO out of wallet
3. Try to deposit any amount
4. Should fail with balance error

**✅ PASS** if error caught before submission.

### Test 8.3: Network Timeout

1. Disconnect internet (or kill backend)
2. Try to deposit
3. Should eventually show timeout error (not hang forever)

**✅ PASS** if error occurs with 60-second timeout.

### Test 8.4: Invalid App ID

1. Change `VITE_APP_ID` to invalid value (e.g., `999999999`)
2. Try to deposit
3. Should show: "App not configured" or similar

**✅ PASS** if validation catches invalid app.

---

## 📊 Test Suite 9: Data Persistence

### Test 9.1: Page Refresh
1. Make deposit
2. Press `F5` to refresh page
3. Dashboard should still show updated values (from cache)

**✅ PASS** if data persists.

### Test 9.2: Backend Restart
1. Make deposit
2. Stop backend (`Ctrl+C` in backend terminal)
3. Restart backend (`npm run dev`)
4. Frontend should still show cached data
5. Syncing should resume

**✅ PASS** if cache survives restart.

### Test 9.3: Transaction History Persistence
1. Make multiple deposits/withdrawals
2. Stop backend, restart
3. Transaction history should still be visible

**✅ PASS** if history in SQLite persists.

---

## 🔐 Test Suite 10: Security Validations

### Test 10.1: Atomic Group Validation
1. Make deposit in browser console
2. Check that grouped transactions are signed together
3. One transaction cannot be signed without the other

**✅ PASS** if group is never split.

### Test 10.2: Wallet Address Validation
1. Try to deposit with mismatched addresses
2. Should fail validation

**✅ PASS** if addresses are properly validated.

### Test 10.3: Amount Validation
1. Try to deposit negative numbers
2. Try to enter letters in amount field
3. Should show appropriate error

**✅ PASS** if validation prevents invalid inputs.

---

## 📱 Test Suite 11: UI/UX

### Test 11.1: Loading States
1. Make deposit
2. While pending, UI should show loading spinner
3. Buttons should be disabled
4. Cannot start another transaction

**✅ PASS** if UI prevents double-clicking.

### Test 11.2: Error Messages
1. Trigger errors from Test 8 suite
2. Error messages should be:
   - Clear and specific
   - Actionable (suggest solutions)
   - Display in snackbar/toast

**✅ PASS** if messages are helpful.

### Test 11.3: Animations
1. Dashboard updates should animate smoothly
2. Counters should count up (not jump)
3. No jank or stuttering

**✅ PASS** if animations are smooth.

---

## 📈 Full Flow Test Scenario

Complete end-to-end test:

1. **Setup** (Test 1.1-1.3)
   - ✅ Verify backend health
   - ✅ Verify frontend config
   - ✅ Verify database

2. **Connect** (Test 2.1)
   - ✅ Connect wallet

3. **Opt-In** (Test 3.1)
   - ✅ Opt into app

4. **First Deposit** (Test 4.1)
   - ✅ Deposit 1 ALGO
   - ✅ Verify dashboard updates
   - ✅ Check streak = 1

5. **Second Deposit** (Test 4.3)
   - ✅ Deposit 1 ALGO again
   - ✅ Verify streak = 2
   - ✅ Verify XP calculation

6. **Withdrawal** (Test 5.1)
   - ✅ Withdraw 0.5 ALGO
   - ✅ Verify balance decreases
   - ✅ Check transaction history

7. **Persistence** (Test 9.1)
   - ✅ Refresh page
   - ✅ Data should persist

8. **Sync Verification** (Test 6.1)
   - ✅ Check backend logs show sync
   - ✅ Check SQLite has correct data

**✅ ALL PASS**: Smart Vault is production-ready! 🚀

---

## 🐛 Troubleshooting

### Issue: "App not configured" error
**Solution:**
1. Check `VITE_APP_ID` in both `.env` files
2. Restart both frontend and backend
3. Verify APP_ID is not `0`

### Issue: Deposit never completes
**Solution:**
1. Check wallet is connected
2. Check you have enough balance (>2 ALGO)
3. Check backend logs for errors
4. Retry transaction

### Issue: Dashboard shows wrong total
**Solution:**
1. Stop backend
2. Delete `backend/vault.db`
3. Restart backend (will rebuild cache)
4. Frontend will resync

### Issue: Streak shows wrong count
**Solution:**
1. Check last deposit time is within 24 hours
2. Check backend logs for streak calculation
3. Monitor `streak_count` in SQLite

### Issue: Withdrawal fails with "cannot withdraw more than total_saved"
**Solution:**
1. Check actual balance on blockchain
2. Try withdrawing smaller amount (e.g., 0.1 ALGO)
3. Ensure you didn't already withdraw in same session

### Issue: Network timeout errors
**Solution:**
1. Check internet connection
2. If using public node, try alternative RPC
3. Run local node: `algokit localnet start`

---

## 📚 Files to Monitor

During testing, monitor these key files:

```
backend/
  ├── vault.db           # SQLite cache (check with: sqlite3 vault.db)
  ├── server.js          # Check logs for errors
  └── syncEngine.js      # Check sync timing

projects/Vaulttracker-frontend/
  ├── src/services/vaultService.ts  # Deposit/withdraw logic
  ├── src/components/                # UI components
  └── .env                           # Configuration

projects/Vaulttracker-contracts/
  └── vault/contract.py  # Smart contract logic
```

---

## ✅ Final Verification Checklist

Before declaring Smart Vault production-ready:

- [ ] All 11 test suites pass
- [ ] No console errors on frontend
- [ ] No errors in backend logs
- [ ] Deposits and withdrawals work reliably
- [ ] Sync happens within expected timeframes
- [ ] XP/streak calculations are correct
- [ ] Transactions persist in history
- [ ] UI animations are smooth
- [ ] Error messages are helpful
- [ ] Data survives page refresh
- [ ] Data survives backend restart

**If all boxes are checked: 🎉 Smart Vault is ready for production!**

---

## 📞 Debugging Commands

Useful commands for debugging:

```bash
# Check backend health
curl http://localhost:3001/health

# Sync user manually
curl -X POST http://localhost:3001/sync/TXVYC...

# Get user state
curl http://localhost:3001/user/TXVYC...

# Get transactions
curl http://localhost:3001/transactions/TXVYC...

# Check database
sqlite3 backend/vault.db ".tables"
sqlite3 backend/vault.db "SELECT * FROM users;"

# Check backend logs (in background)
cd backend && npm run dev 2>&1 | tee backend.log
```

---

**Last Updated:** March 31, 2026
**Status:** Production-Ready Architecture ✅
