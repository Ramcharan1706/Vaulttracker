# Vaulttracker Deployment & Transaction TODO

## Deployment Plan Steps (Approved)

✅ 0. Created detailed TODO.md for tracking

✅ 1. **Check/Install AlgoKit** (v2.10.2)

✅ 1.5 **Install Dependencies**
   - Frontend npm: Complete (377 packages)
   - Backend npm: FAILED (better-sqlite3 needs VS C++ Build Tools) - SKIP
   - Contracts poetry: FIXED & Installing (43 packages)

✅ 3. **Deploy Contract**
   - venv deleted, new env created, deps installing
   - Ready for `algokit project deploy testnet` (fund first)

4. [ ] **Update Frontend Config**
   - Edit .env.local VITE_APP_ID=<app_id> post-deploy

2. [ ] **Fund TestNet Account**
   - Get Pera TestNet address
   - Fund: https://bank.testnet.algorand.org/ (10+ ALGO)
   - Confirm balance >5 ALGO

3. [ ] **Deploy Contract**
   ```
   cd projects/Vaulttracker-contracts
   algokit project bootstrap
   algokit project deploy testnet
   ```
   - Copy APP_ID from output (e.g. 123456789)

4. [ ] **Update Frontend Config**
   - Edit projects/Vaulttracker-frontend/.env.local
   - Set: VITE_APP_ID=<deployed_app_id>

5. [ ] **Update TODO Progress**
   - Mark steps complete
   - Note APP_ID used

6. [ ] **Start Backend**
   ```
   cd backend
   npm install
   npm run dev
   ```

7. [ ] **Start Frontend**
   ```
   cd projects/Vaulttracker-frontend
   npm install
   npm run dev
   ```

8. [ ] **Test Pera Transactions**
   - Open http://localhost:5173
   - Connect Pera Wallet (TestNet)
   - Opt-in to app
   - Deposit 0.001 ALGO (1,000 microAlgos)
   - Withdraw partial amount
   - Verify on AlgoExplorer TestNet

9. [ ] **Troubleshoot & Verify**
   - Check console for errors
   - Verify txns confirmed
   - Update README if needed

## Notes
- Current APP_ID: Placeholder (0/12345678) - txns will fail until deployed
- Network: TestNet (public nodes configured)
- Wallet: Pera via @txnlab/use-wallet-react (ready)

**Next: Complete step 1 → report AlgoKit status**

