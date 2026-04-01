#!/usr/bin/env python3
"""
Simple Algorand contract deployment script
Deploy SavingsVault contract to testnet
"""

import os
import json
import sys
from pathlib import Path

def get_contract_bytes():
    """Get compiled contract bytes"""
    artifacts_path = Path(__file__).parent / "artifacts" / "vault.json"
    
    if not artifacts_path.exists():
        print("⚠️  Compiled contract not found!")
        print("   You need to compile the contract first.")
        print("   Follow these steps:")
        print("   1. Install AlgoKit: https://github.com/algorandfoundation/algokit-cli")
        print("   2. Run: algokit project deploy localnet --testnet")
        print("   OR use the Pera Web UI to manually create the app")
        return None
    
    try:
        with open(artifacts_path, 'r') as f:
            data = json.load(f)
            return data.get('approval'), data.get('clear_state')
    except Exception as e:
        print(f"Error reading compiled contract: {e}")
        return None, None

def deploy_with_algokit():
    """Deploy using algokit CLI"""
    print("\n🚀 Using AlgoKit to deploy...")
    print("   Running: algokit project deploy testnet")
    
    import subprocess
    try:
        result = subprocess.run(
            ["algokit", "project", "deploy", "testnet"],
            cwd=Path(__file__).parent,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ Contract deployed successfully!")
            print("\nOutput:")
            print(result.stdout)
            
            # Extract APP_ID from output
            for line in result.stdout.split('\n'):
                if 'Application ID' in line or 'app_id' in line:
                    print(f"\n🎯 Found: {line}")
            return True
        else:
            print("❌ Deployment failed!")
            print("Error:", result.stderr)
            return False
    except FileNotFoundError:
        print("❌ AlgoKit not found!")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("╔════════════════════════════════════════╗")
    print("║ Vaulttracker Contract Deployment      ║")
    print("║ Network: Algorand Testnet             ║")
    print("╚════════════════════════════════════════╝")
    
    # Check if AlgoKit is available
    import shutil
    if shutil.which("algokit"):
        success = deploy_with_algokit()
        sys.exit(0 if success else 1)
    else:
        print("\n⚠️  AlgoKit CLI not found!")
        print("\n📖 Manual Deployment Options:")
        print("\n1️⃣  Using AlgoKit CLI (Recommended):")
        print("   • Install: https://github.com/algorandfoundation/algokit-cli")
        print("   • Deploy: algokit project deploy testnet")
        print("\n2️⃣  Using Pera Web UI (Web-based):")
        print("   • Go to: https://pera.ai")
        print("   • Deploy from web interface")
        print("\n3️⃣  Using Goal (Advanced):")
        print("   • Use: goal app create --approval-prog ...")
        print("\n✅ After deployment, get your APP_ID and:")
        print("   • Update: .env.local")
        print("   • Set: VITE_APP_ID=<your-app-id>")
        print("   • Restart: npm run dev")

if __name__ == "__main__":
    main()

