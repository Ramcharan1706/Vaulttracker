# 🐛 Troubleshooting Guide

## Common Errors & Solutions

---

## ❌ Error: "Cannot read property 'appLocalState'"

**When:** Trying to check balance or deposit
**Cause:** Contract not deployed yet

**Fix:**
```bash
cd projects/Vaulttracker-contracts
algokit project deploy testnet
# Get the APP_ID from output
```

---

## ❌ Error: "APP_ID not configured" or Shows Placeholder

**When:** App loads or tries to transact
**Cause:** VITE_APP_ID not set in `.env.local`

**Fix:**
```bash
# Edit projects/Vaulttracker-frontend/.env.local
# Change:
VITE_APP_ID=12345678
# To your actual APP_ID from deployment:
VITE_APP_ID=123456789
```

Then restart dev server:
```bash
cd projects/Vaulttracker-frontend
npm run dev
```

---

## ❌ Error: "Insufficient Funds"

**When:** Trying to deposit
**Cause:** No testnet Algo in wallet

**Fix:**
1. Open https://bank.testnet.algorand.org/
2. Enter your Pera Wallet address
3. Click request funds
4. Wait 10 seconds
5. Check Pera Wallet (should have 10 TEST Algo)

---

## ❌ Error: "Wallet Rejected Transaction"

**When:** Click Deposit or Withdraw, wallet doesn't appear
**Cause:** Pera Wallet not connected

**Fix:**
1. Install Pera Wallet: https://perawallet.app
2. Create wallet and add testnet funds
3. Return to app
4. Click **Connect Wallet**
5. Choose Pera
6. Approve connection

---

## ❌ Error: "Failed to fetch transaction"

**When:** After clicking Deposit
**Cause:** One-time network issue

**Fix:**
- Try again (usually works second time)
- Check internet connection
- Ensure testnet node is responding: `https://testnet-api.algonode.cloud/health`

---

## ❌ Error: "Transaction not confirmed in X rounds"

**When:** Transaction takes too long
**Cause:** Network congestion or invalid transaction

**Fix:**
1. Wait 10 seconds and try again
2. Verify APP_ID is correct
3. Verify deposit amount is >= 1000 microAlgo (0.001 Algo)
4. Check Pera Wallet has enough funds

---

## ❌ Error: Backend on port 3001 not responding

**When:** After deposit (optional backend call)
**Cause:** Backend not running or not needed

**Fix:**
```bash
# Optional: Start backend if needed for sync tracking
cd backend
npm install
npm start
```

Backend is optional - deposits work without it!

---

## ❌ Error: "Invalid Account" or "Account Not Found"

**When:** Trying to view balance
**Cause:** Address not opted-in to app

**Fix:**
- First deposit automatically opts you in
- If not opted-in, deposits will fail
- Solution: Let the app auto-opt-in, then deposit

---

## ❌ Error: "Failed to load resource: 404"

**When:** Loading the app
**Cause:** Missing .env variables

**Fix:**
```bash
# Verify .env.local has all required variables:
VITE_ALGOD_NETWORK=testnet
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=""
VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud
VITE_INDEXER_PORT=443
VITE_INDEXER_TOKEN=""
VITE_APP_ID=123456789
```

---

## ✅ Verification Steps

If anything isn't working, run through this checklist:

- [ ] **Testnet Wallet Setup**
  ```
  Pera installed? ✓
  Wallet created? ✓
  Has testnet algo? ✓ (10+ TEST)
  ```

- [ ] **Contract Deployed**
  ```bash
  cd projects/Vaulttracker-contracts
  algokit project deploy testnet
  # Does it show "Deployed app with ID: XXXXXX"?
  ```

- [ ] **Environment Set**
  ```bash
  cat projects/Vaulttracker-frontend/.env.local
  # VITE_APP_ID should be your contract ID, not 12345678
  ```

- [ ] **Frontend Running**
  ```bash
  cd projects/Vaulttracker-frontend
  npm run dev
  # Should see "VITE v5.X.X  ready in XXX ms"
  ```

- [ ] **Wallet Connected**
  - Open http://localhost:5173
  - Click "Connect Wallet"
  - Pera popup appears? ✓
  - Address shows? ✓

- [ ] **Balance Shows**
  - If newly opted-in: "0.00 Algo saved"
  - After deposit: Shows correct amount

---

## 🔧 Debug Mode

To see detailed logs:

**Frontend:**
```javascript
// In browser console, run:
localStorage.setItem('DEBUG', 'true')
// Reload page
```

**Backend:**
```bash
# Run with verbose logging
NODE_DEBUG=* npm start
```

---

## 🆘 Still Stuck?

Try these:

1. **Hard refresh page**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache**: DevTools → Application → Clear Storage
3. **Reinstall packages**:
   ```bash
   rm -rf node_modules
   npm install
   npm run dev
   ```
4. **Check network tab**: DevTools → Network → Look for 404 errors
5. **Verify testnet access**: `curl https://testnet-api.algonode.cloud/health`

---

## 📞 Support Resources

| Issue | Resource |
|-------|----------|
| Pera Wallet Help | https://perawallet.app/support |
| Algorand Docs | https://developer.algorand.org/ |
| Testnet Faucet | https://bank.testnet.algorand.org/ |
| Block Explorer | https://allo.info/ |

---

## ✨ Expected Behavior (Working System)

### Deposit Flow ✅
1. Enter amount (0.001 Algo minimum)
2. Click "Deposit Now"
3. Pera Wallet opens
4. Sign transaction
5. Wallet closes
6. `✅ Deposit successful: TXID...`
7. Balance updates

### Withdraw Flow ✅
1. Enter amount
2. Click "Withdraw Now"
3. Pera Wallet opens
4. Sign transaction
5. Wallet closes
6. `✅ Withdrawal successful: TXID...`
7. Funds appear in Pera Wallet

**If you see this flow, everything is working perfectly!**
