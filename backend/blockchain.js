import { Algodv2, Indexer } from 'algosdk'
import axios from 'axios'

// Load from environment
const ALGOD_SERVER = process.env.ALGOD_SERVER || 'http://localhost'
const ALGOD_PORT = process.env.ALGOD_PORT || '4001'
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || 'a'.repeat(64)
const INDEXER_SERVER = process.env.INDEXER_SERVER || 'http://localhost'
const INDEXER_PORT = process.env.INDEXER_PORT || '8980'
const INDEXER_TOKEN = process.env.INDEXER_TOKEN || 'a'.repeat(64)
const APP_ID = parseInt(process.env.APP_ID || '0')


let algodClient = null
let indexerClient = null

/**
 * Get or initialize Algod client
 */
export function getAlgodClient() {
  if (!algodClient) {
    algodClient = new Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
  }
  return algodClient
}

/**
 * Get or initialize Indexer client
 */
export function getIndexerClient() {
  if (!indexerClient) {
    indexerClient = new Indexer(INDEXER_TOKEN, INDEXER_SERVER, INDEXER_PORT)
  }
  return indexerClient
}

/**
 * Fetch user's vault state from blockchain
 * Returns: { totalSaved, lastDepositTime, streakCount, milestonesUnlocked, vaultUnlockTime }
 */
export async function getUserVaultState(userAddress) {
  try {
    if (!APP_ID || APP_ID === 0) {
      throw new Error('APP_ID not configured')
    }

    const algod = getAlgodClient()
    const accountInfo = await algod.accountInformation(userAddress).do()

    // Find local state for our app
    const localState = accountInfo.appsLocalState?.find(
      (app) => app.id === APP_ID
    )

    if (!localState) {
      // User hasn't opted in yet
      return {
        totalSaved: 0,
        lastDepositTime: 0,
        streakCount: 0,
        milestonesUnlocked: 0,
        vaultUnlockTime: 0,
      }
    }

    // Parse local state key-value pairs
    const parseValue = (key) => {
      const entry = localState.keyValue?.find((kv) => kv.key === btoa(key))
      if (!entry) return 0
      return entry.value?.type === 2 ? parseInt(entry.value.uint) : 0
    }

    return {
      totalSaved: parseValue('total_saved'),
      lastDepositTime: parseValue('last_deposit_time'),
      streakCount: parseValue('streak_count'),
      milestonesUnlocked: parseValue('milestones_unlocked'),
      vaultUnlockTime: parseValue('vault_unlock_time'),
    }
  } catch (error) {
    console.error(`❌ Error fetching vault state for ${userAddress}:`, error.message)
    throw error
  }
}

/**
 * Fetch user's recent transactions from indexer
 */
export async function getUserTransactions(userAddress, limit = 50) {
  try {
    const indexer = getIndexerClient()

    // Query for payment transactions involving the user and app
    const response = await indexer
      .searchForTransactions()
      .where({ address: userAddress })
      .limit(limit)
      .do()

    return response.transactions || []
  } catch (error) {
    console.error(`❌ Error fetching transactions for ${userAddress}:`, error.message)
    throw error
  }
}

/**
 * Get app global state (milestones)
 */
export async function getAppGlobalState() {
  try {
    if (!APP_ID || APP_ID === 0) {
      throw new Error('APP_ID not configured')
    }

    const algod = getAlgodClient()
    const appInfo = await algod.getApplicationByID(APP_ID).do()

    const globalState = appInfo.params.globalState || []

    const parseValue = (key) => {
      const entry = globalState.find((s) => s.key === btoa(key))
      if (!entry) return 0
      return entry.value?.type === 2 ? parseInt(entry.value.uint) : 0
    }

    return {
      milestone1: parseValue('milestone_1'),
      milestone2: parseValue('milestone_2'),
      milestone3: parseValue('milestone_3'),
    }
  } catch (error) {
    console.error('❌ Error fetching app global state:', error.message)
    throw error
  }
}

/**
 * Verify transaction on-chain
 */
export async function verifyTransaction(txId) {
  try {
    const indexer = getIndexerClient()
    const response = await indexer.searchForTransactions().txid(txId).do()

    return response.transactions && response.transactions.length > 0
      ? response.transactions[0]
      : null
  } catch (error) {
    console.error(`❌ Error verifying transaction ${txId}:`, error.message)
    throw error
  }
}
