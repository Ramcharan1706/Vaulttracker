#!/usr/bin/env python3
"""Direct contract deployment using algosdk"""

import json
import base64
from algosdk import mnemonic, transaction
from algosdk.v2client import algod
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    AccountTransactionSigner,
    TransactionWithSigner,
)

# Testnet settings
ALGOD_URL = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""
CREATOR_MNEMONIC = (
    "palm winter wheat butter range truth matter resource waste era grocery apple abuse between industry "
    "affair peck draft window arrive enrich habit quarter above achieve"
)

def deploy():
    """Deploy contract to testnet"""
    
    # Initialize client
    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_URL)
    
    # Get creator
    private_key = mnemonic.to_private_key(CREATOR_MNEMONIC)
    creator_addr = mnemonic.to_public_key(CREATOR_MNEMONIC)
    
    print(f"📦 Creator: {creator_addr}")
    
    try:
        # Check balance
        account_info = client.account_info(creator_addr)
        balance = account_info["amount"] / 1e6
        print(f"💰 Balance: {balance} ALGO")
        
        if balance < 0.2:
            print("\n❌ INSUFFICIENT FUNDS!")
            print("   Get testnet ALGO: https://bank.testnet.algorand.org/")
            return
            
    except Exception as e:
        print(f"❌ Cannot fetch account info: {e}")
        return
    
    print("\n⚙️  Compiling contract...")
    
    # Simple approval program (basic savings vault)
    approval_program = """
#pragma version 10
method opt_in() {
    app_local_put(txn SenderTxn, app Current, Bytes "total_saved", uint64 0)
}
method deposit() {
    assert gtxn 0 TypeEnum == Txn TypeEnum.Payment
    assert gtxn 0 Receiver == app CurrentAddress
    assert gtxn 0 Amount > uint64 0
    assert gtxn 0 Sender == txn SenderTxn
    assert gtxn 0 RekeyTo == Global ZeroAddress
    assert gtxn 0 CloseRemainderTo == Global ZeroAddress
    
    (int has_value, uint64 total_saved) = app_local_get_ex(txn SenderTxn, app Current, Bytes "total_saved")
    uint64 new_total = total_saved + gtxn 0 Amount
    app_local_put(txn SenderTxn, app Current, Bytes "total_saved", new_total)
    
    log Bytes "DEPOSIT"
    log itob(gtxn 0 Amount)
}
method withdraw(uint64 amount) {
    (int has_value, uint64 user_balance) = app_local_get_ex(txn SenderTxn, app Current, Bytes "total_saved")
    assert has_value
    assert user_balance >= amount
    
    new_balance = user_balance - amount
    app_local_put(txn SenderTxn, app Current, Bytes "total_saved", new_balance)
    
    itxn_begin
    itxn_field TypeEnum = Txn TypeEnum.Payment
    itxn_field Receiver = txn SenderTxn
    itxn_field Amount = amount
    itxn_submit
    
    log Bytes "WITHDRAW"
    log itob(amount)
}
"""
    
    print("\n⚠️  Contract compilation requires PyTeal/Beaker installation.")
    print("    This is a complex deployment step.")
    print("\n🔗 EASIER ALTERNATIVE:")
    print("   1. Go to: https://app.perawallet.app/")
    print("   2. Create accounts & fund from testnet")
    print("   3. Deploy contract via web interface")
    print("   4. Copy APP_ID")
    print("   5. Update VITE_APP_ID in .env.local")
    print("\n   Then run: npm run dev")

if __name__ == "__main__":
    deploy()
