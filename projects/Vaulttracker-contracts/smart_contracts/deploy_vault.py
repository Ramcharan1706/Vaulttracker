#!/usr/bin/env python3
"""
Deployment script for Savings Vault Tracker

Deploys the SavingsVault contract and initializes it with milestone thresholds.
"""

import json
import os
from pathlib import Path

from algokit_utils import (
    ABIMethod,
    AppClient,
    AppClientError,
    AppCreateCallParameters,
    AppDeleteCallParameters,
    AppUpdateCallParameters,
    TransactionParameters,
    MethodCallParams,
    ApplicationClient,
)
from algosdk import mnemonic, transaction
from algosdk.v2client import algod, indexer


def get_algod_client():
    """Get algod client from environment or defaults"""
    algod_server = os.environ.get("ALGOD_SERVER", "http://localhost:4001")
    algod_token = os.environ.get("ALGOD_TOKEN", "a" * 64)
    return algod.AlgodClient(algod_token, algod_server)


def get_indexer_client():
    """Get indexer client from environment or defaults"""
    indexer_server = os.environ.get("INDEXER_SERVER", "http://localhost:8980")
    indexer_token = os.environ.get("INDEXER_TOKEN", "a" * 64)
    return indexer.IndexerClient(indexer_token, indexer_server)


def get_creator_account():
    """Get creator account from mnemonic in environment"""
    mnemonic_str = os.environ.get(
        "CREATOR_MNEMONIC",
        # Default testnet creator (DO NOT USE IN PRODUCTION)
        "palm winter wheat butter range truth matter resource waste era grocery apple abuse between industry "
        "affair peck draft window arrive enrich habit quarter above achieve",
    )

    private_key = mnemonic.to_private_key(mnemonic_str)
    address = mnemonic.from_private_key(private_key)

    return {"address": address, "private_key": private_key}


def deploy_vault_contract(delete_existing: bool = False):
    """
    Deploy the SavingsVault contract

    Args:
        delete_existing: If True, delete any existing deployment and create new

    Returns:
        tuple: (app_id, app_address)
    """
    algod_client = get_algod_client()
    creator = get_creator_account()

    # Load contract from compiled file
    contract_path = Path(__file__).parent / "vault" / "contract.py"

    if not contract_path.exists():
        raise FileNotFoundError(f"Contract file not found: {contract_path}")

    # Compile the contract to TEAL
    # Note: In a real deployment, you'd use AlgoKit's compilation pipeline
    print(f"📝 Loading contract from {contract_path}")

    # For this example, we'll use AppClient with a compiled contract
    # You'll need to compile the PyTeal contract first

    app_spec = {
        "contract": {
            "name": "SavingsVault",
            "methods": [
                {
                    "name": "create_vault",
                    "args": [],
                    "returns": {"type": "void"},
                }
            ],
        }
    }

    # Use AlgodClient directly to submit transactions
    params = algod_client.suggested_params()

    print(f"🔐 Deploying contract from creator: {creator['address']}")

    # TODO: Compile and deploy contract
    # This requires algokit build step to generate ABI and contract bytecode

    print("✅ Contract deployment would go here")
    print("📋 Run 'algokit project run build' to compile the contract")


def initialize_vault(app_id: int):
    """Initialize vault with milestone thresholds"""
    algod_client = get_algod_client()
    creator = get_creator_account()

    params = algod_client.suggested_params()

    # Create app call transaction to initialize
    app_call_txn = transaction.ApplicationNoOpTxn(
        sender=creator["address"],
        index=app_id,
        app_args=[b"create_vault"],
        foreign_accounts=[],
        foreign_apps=[],
        foreign_assets=[],
        sp=params,
    )

    # Sign and submit
    signed_txn = app_call_txn.sign(creator["private_key"])
    txid = algod_client.send_transaction(signed_txn)

    print(f"✅ Vault initialized! TxID: {txid}")

    return txid


def opt_in_to_vault(app_id: int, account_key: str):
    """
    Opt a user account into local state of the vault

    Args:
        app_id: Application ID
        account_key: Mnemonic string for account
    """
    algod_client = get_algod_client()

    private_key = mnemonic.to_private_key(account_key)
    address = mnemonic.from_private_key(private_key)

    params = algod_client.suggested_params()

    # Create opt-in transaction
    opt_in_txn = transaction.ApplicationOptInTxn(
        sender=address,
        index=app_id,
        app_args=[b"opt_in"],
        foreign_accounts=[],
        foreign_apps=[],
        foreign_assets=[],
        sp=params,
    )

    signed_txn = opt_in_txn.sign(private_key)
    txid = algod_client.send_transaction(signed_txn)

    print(f"✅ User {address} opted into vault! TxID: {txid}")

    return txid, address


def make_deposit(app_id: int, deposit_amount: int, user_key: str):
    """
    Make a deposit to the vault using grouped transactions

    Args:
        app_id: Application ID
        deposit_amount: Amount in microAlgos
        user_key: Mnemonic string for user account
    """
    algod_client = get_algod_client()

    private_key = mnemonic.to_private_key(user_key)
    address = mnemonic.from_private_key(private_key)

    # Get app address
    app_info = algod_client.application_info(app_id)
    app_address = transaction.get_application_address(app_id)

    params = algod_client.suggested_params()

    # Transaction 0: Payment from user to app
    payment_txn = transaction.PaymentTxn(
        sender=address,
        receiver=app_address,
        amt=deposit_amount,
        sp=params,
    )

    # Transaction 1: App call to deposit
    app_call_txn = transaction.ApplicationNoOpTxn(
        sender=address,
        index=app_id,
        app_args=[b"deposit"],
        sp=params,
    )

    # Group transactions
    gid = transaction.calculate_group_id([payment_txn, app_call_txn])
    payment_txn.group = gid
    app_call_txn.group = gid

    # Sign transactions
    signed_payment = payment_txn.sign(private_key)
    signed_app_call = app_call_txn.sign(private_key)

    # Submit grouped transactions
    txn_list = [signed_payment, signed_app_call]
    txids = algod_client.send_transactions(txn_list)

    print(f"✅ Deposit from {address}: {deposit_amount} microAlgos")
    print(f"   TxID: {txids[0]}")

    return txids


if __name__ == "__main__":
    print("🚀 Savings Vault Tracker Deployment")
    print("=" * 50)
    print(
        "Note: Contract compilation requires 'algokit project run build' to be run first"
    )
    print("This script provides the deployment framework")
    print("=" * 50)
