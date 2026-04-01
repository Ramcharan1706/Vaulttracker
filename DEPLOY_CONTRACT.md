#!/usr/bin/env python3
"""
VAULT TRACKER - CONTRACT DEPLOYMENT HELPER

This script helps you deploy the SavingsVault contract to Algorand Testnet.
Choose one of the deployment methods below.
"""

import os
import sys
from pathlib import Path

print("""
╔════════════════════════════════════════════════════════════╗
║          SMART VAULT - DEPLOYMENT HELPER                  ║
╚════════════════════════════════════════════════════════════╝

⚠️  You're using placeholder APP_ID (12345678).
    Deploy the contract to get a real APP_ID.

═══════════════════════════════════════════════════════════
""")

print("""
📋 CHOOSE YOUR DEPLOYMENT METHOD:

1️⃣  METHOD A: Using Pera Web (EASIEST - No setup needed)
────────────────────────────────────────────────────
   • Go: https://app.perawallet.app/
   • Create new account or use existing
   • Fund it: https://bank.testnet.algorand.org/
   • Deploy contract manually via Pera Web IDE
   • Or use: https://algorand-builder.gitbook.io/

2️⃣  METHOD B: Using AlgoKit (LOCAL - Requires setup)
────────────────────────────────────────────────────
   • Run: algokit project deploy testnet
   • Contract deploys → APP_ID printed
   • Copy APP_ID to .env.local

3️⃣  METHOD C: Using Python Script (MANUAL)
────────────────────────────────────────────────────
   Requirements:
   • pip install algokit-utils
   • pip install algorand-python

   Then run:
   • python3 deploy_manual.py

═══════════════════════════════════════════════════════════

🚀 QUICK START (METHOD B - RECOMMENDED):

Step 1: Fund your account
   URL: https://bank.testnet.algorand.org/
   Enter your address (from Pera wallet)
   Get 10+ ALGO

Step 2: Ensure algokit is installed
   $ pip install algokit-utils

Step 3: Deploy contract
   $ cd projects/Vaulttracker-contracts
   $ algokit project deploy testnet

Step 4: Copy the APP_ID from output
   Example:
   ✅ Application deployed
   📱 APP_ID: 123456789

Step 5: Update .env.local
   VITE_APP_ID=123456789

Step 6: Restart frontend
   $ npm run dev

✨ DONE! Your app now has a real contract.

═══════════════════════════════════════════════════════════

📞 TROUBLESHOOTING:

Q: "algokit project deploy testnet" not found
A: Install algokit: pip install algokit

Q: "No funds in account"
A: Get testnet ALGO: https://bank.testnet.algorand.org/

Q: "Contract won't deploy"
A: Check Python version (need 3.10+): python --version

═══════════════════════════════════════════════════════════
""")

print("\n💡 Your current setup:")
print(f"   • Frontend: projects/Vaulttracker-frontend")
print(f"   • Contract: projects/Vaulttracker-contracts")
print(f"   • Config: .env.local (update VITE_APP_ID here)")
print(f"\n   Current: VITE_APP_ID=12345678 (placeholder)")
print(f"   Needed:  VITE_APP_ID=<real_app_id>")
