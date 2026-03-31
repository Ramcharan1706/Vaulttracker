import logging

import algokit_utils

logger = logging.getLogger(__name__)


# define deployment behaviour based on supplied app spec
def deploy() -> None:
    """
    Deploy the SavingsVault contract
    
    This function:
    1. Creates the contract application
    2. Initializes global state with milestone thresholds
    3. Funds the app account for future operations
    """
    from smart_contracts.artifacts.vault.vault_client import (
        VaultClient,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")

    logger.info("🚀 Deploying SavingsVault contract...")
    logger.info(f"Deployer: {deployer.address}")

    # Get the app factory
    factory = algorand.client.get_typed_app_factory(
        VaultClient, default_sender=deployer.address
    )

    # Deploy the contract
    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )

    # Log deployment result
    logger.info(f"✅ Contract deployed successfully!")
    logger.info(f"   App ID: {app_client.app_id}")
    logger.info(f"   App Address: {app_client.app_address}")
    logger.info(f"   Operation: {result.operation_performed}")

    # Fund the app address with 1 ALGO for operations
    if result.operation_performed in [
        algokit_utils.OperationPerformed.Create,
        algokit_utils.OperationPerformed.Replace,
    ]:
        logger.info(f"💰 Funding app address with 1 ALGO...")
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=1),
                sender=deployer.address,
                receiver=app_client.app_address,
            )
        )
        logger.info(f"✅ App funding complete")

    logger.info(f"\n📊 SavingsVault Deployment Summary:")
    logger.info(f"   App ID: {app_client.app_id}")
    logger.info(f"   App Address: {app_client.app_address}")
    logger.info(f"   Network: {algorand.client.indexer_request('GET', 'health').status_code}")
    logger.info(f"\n⚙️  UPDATE YOUR .env FILE:")
    logger.info(f"   VITE_APP_ID={app_client.app_id}")

