/**
 * Backend Sync Service
 * Communicates with the Node.js backend for instant data fetching via SQLite
 * Maintains the hybrid architecture: blockchain is source of truth, SQLite is cache
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

/**
 * Sync user state from blockchain via backend
 * Called after deposits/withdrawals for immediate data availability
 */
export async function syncUserStateFromBackend(userAddress: string) {
  try {
    console.log(`🔄 Syncing with backend for ${userAddress}...`)

    const response = await fetch(`${BACKEND_URL}/sync/${userAddress}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Backend sync failed: ${response.statusText}`)
    }

    const data = await response.json()

    console.log('✅ Backend sync complete:')
    console.log(`   Total Saved: ${(data.userState?.totalSaved || 0) / 1e6} ALGO`)
    console.log(`   Streak: ${data.userState?.streakCount || 0}`)
    console.log(`   XP: ${data.xp?.xpPoints || 0}, Level: ${data.xp?.level || 1}`)

    return {
      success: true,
      userState: data.userState,
      xp: data.xp,
      syncedAt: data.syncedAt,
    }
  } catch (error) {
    console.warn('⚠️ Backend sync error:', (error as any).message)
    // Return null to indicate sync failed - UI will use cached data
    return null
  }
}

/**
 * Get user data from SQLite cache via backend (instant)
 * No blockchain wait, pure database query
 */
export async function getUserFromBackend(userAddress: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/user/${userAddress}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`)
    }

    const user = await response.json()

    return {
      address: user.address,
      totalSaved: user.totalSaved,
      streakCount: user.streakCount,
      xpPoints: user.xpPoints,
      level: user.level,
      lastDepositTime: user.lastDepositTime,
      lastUpdated: user.lastUpdated,
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch user from backend:', (error as any).message)
    return null
  }
}

/**
 * Get transaction history from SQLite cache
 */
export async function getTransactionsFromBackend(userAddress: string, limit = 50) {
  try {
    const response = await fetch(`${BACKEND_URL}/transactions/${userAddress}?limit=${limit}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`)
    }

    const data = await response.json()
    return data.transactions || []
  } catch (error) {
    console.warn('⚠️ Failed to fetch transactions from backend:', (error as any).message)
    return []
  }
}

/**
 * Record a pending transaction in the backend
 */
export async function recordTransactionInBackend(
  txId: string,
  address: string,
  amount: number,
  type: 'deposit' | 'withdrawal'
) {
  try {
    const response = await fetch(`${BACKEND_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txId,
        address,
        amount,
        type,
        timestamp: Math.floor(Date.now() / 1000),
      }),
    })

    if (!response.ok) {
      console.warn('⚠️ Failed to record transaction in backend')
      return false
    }

    return true
  } catch (error) {
    console.warn('⚠️ Error recording transaction:', (error as any).message)
    return false
  }
}

/**
 * Get app milestones from backend
 */
export async function getAppStateFromBackend() {
  try {
    const response = await fetch(`${BACKEND_URL}/app/state`)

    if (!response.ok) {
      throw new Error(`Failed to fetch app state: ${response.statusText}`)
    }

    const state = await response.json()
    return state
  } catch (error) {
    console.warn('⚠️ Failed to fetch app state from backend:', (error as any).message)
    return null
  }
}

/**
 * Health check - verify backend is running
 */
export async function backendHealthCheck() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`)
    if (!response.ok) return false

    const data = await response.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}
