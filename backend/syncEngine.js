import { getDatabase } from './database.js'
import { getUserVaultState, getUserTransactions, getAppGlobalState } from './blockchain.js'

/**
 * Sync Engine: Updates SQLite cache with blockchain data
 * This is the critical component that keeps data fresh for instant UI
 */

/**
 * Sync user state from blockchain to SQLite
 * Called after every transaction and periodically
 */
export async function syncUserState(userAddress) {
  try {
    console.log(`🔄 Syncing state for ${userAddress}...`)

    // Fetch from blockchain
    const blockchainState = await getUserVaultState(userAddress)
    const now = Math.floor(Date.now() / 1000)

    const db = getDatabase()

    // Update or insert user record
    const stmt = db.prepare(`
      INSERT INTO users (address, total_saved, streak_count, last_deposit_time, last_updated, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        total_saved = excluded.total_saved,
        streak_count = excluded.streak_count,
        last_deposit_time = excluded.last_deposit_time,
        last_updated = excluded.last_updated
    `)

    stmt.run(
      userAddress,
      blockchainState.totalSaved,
      blockchainState.streakCount,
      blockchainState.lastDepositTime,
      now,
      now
    )

    console.log(`✅ Synced user state:`)
    console.log(`   Total Saved: ${blockchainState.totalSaved / 1e6} ALGO`)
    console.log(`   Streak: ${blockchainState.streakCount}`)

    db.close()

    return {
      success: true,
      data: blockchainState,
      syncedAt: now,
    }
  } catch (error) {
    console.error(`❌ Sync error for ${userAddress}:`, error.message)
    throw error
  }
}

/**
 * Sync transactions from blockchain
 * Detects deposits and withdrawals
 */
export async function syncTransactions(userAddress) {
  try {
    console.log(`📊 Syncing transactions for ${userAddress}...`)

    const blockchainTxns = await getUserTransactions(userAddress, 100)
    const db = getDatabase()
    let syncedCount = 0

    for (const txn of blockchainTxns) {
      // Only process app calls to our vault
      if (txn['app-index'] !== parseInt(process.env.APP_ID || '0')) {
        continue
      }


      // Determine if deposit or withdrawal
      const isDeposit = txn.sender === userAddress && txn['app-args']?.[0] === 'ZGVwb3NpdA==' // base64 "deposit"
      const isWithdraw = txn.sender === userAddress && txn['app-args']?.[0] === 'd2l0aGRyYXc=' // base64 "withdraw"

      if (!isDeposit && !isWithdraw) continue

      // Check if already in cache
      const existing = db.prepare('SELECT tx_id FROM transactions WHERE tx_id = ?').get(txn.id)
      if (existing) continue

      // Calculate amount
      let amount = 0
      if (isDeposit && txn['group'] && txn['group-index'] === 1) {
        // Look for payment txn in group at index 0
        amount = txn.amount || 0
      } else if (isWithdraw) {
        // Withdraw amount is in app args[1]
        amount = txn['app-args']?.[1] ? parseInt(atob(txn['app-args'][1])) : 0
      }

      // Insert transaction
      const stmt = db.prepare(`
        INSERT INTO transactions (tx_id, address, amount, type, timestamp, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        txn.id,
        userAddress,
        amount,
        isDeposit ? 'deposit' : 'withdrawal',
        Math.floor(txn['confirmed-round'] / 1000), // Approximate timestamp
        'confirmed',
        Math.floor(Date.now() / 1000)
      )

      syncedCount++
    }

    console.log(`✅ Synced ${syncedCount} transactions`)

    db.close()

    return {
      success: true,
      syncedCount,
    }
  } catch (error) {
    console.error(`❌ Transaction sync error for ${userAddress}:`, error.message)
    // Don't throw here - allow partial syncs
    return { success: false, syncedCount: 0 }
  }
}

/**
 * Background sync loop
 * Run every 3 seconds to detect changes
 */
export function startBackgroundSync(interval = 3000) {
  console.log('🔄 Starting background sync loop...')

  setInterval(async () => {
    try {
      // In production, would iterate through active users
      // For now, this demonstrates the concept
      console.log(`⏱️  Background sync check (${new Date().toISOString()})`)
    } catch (error) {
      console.error('❌ Background sync error:', error.message)
    }
  }, interval)
}

/**
 * Calculate XP and level based on vault activity
 */
export function calculateXPAndLevel(userAddress) {
  const db = getDatabase()

  try {
    // Get user's transaction history
    const transactionsCountResult = db
      .prepare('SELECT COUNT(*) as count FROM transactions WHERE address = ?')
      .get(userAddress)
    const transactions = transactionsCountResult ? transactionsCountResult.count : 0


    const depositsResult = db
      .prepare('SELECT COUNT(*) as count FROM transactions WHERE address = ? AND type = ?')
      .get(userAddress, 'deposit')
    const deposits = depositsResult ? depositsResult.count : 0


    const userResult = db
      .prepare('SELECT xp_points, streak_count FROM users WHERE address = ?')
      .get(userAddress)
    const user = userResult ? { xp_points: userResult.xp_points || 0, streak_count: userResult.streak_count || 0 } : undefined


    if (!user) {
      return { xpPoints: 0, level: 1 }
    }

    // XP calculation
    let xpPoints = user.xp_points || 0

    // Bonus XP for deposits
    xpPoints += deposits.count * 10

    // Streak bonus
    xpPoints += Math.max(0, user.streak_count - 1) * 5

    // Calculate level (0-100 XP = Level 1, 100-300 = Level 2, etc.)
    const level = Math.floor(xpPoints / 100) + 1

    // Update user
    db.prepare('UPDATE users SET xp_points = ?, level = ? WHERE address = ?').run(
      xpPoints,
      level,
      userAddress
    )

    console.log(`📈 Updated XP for ${userAddress}: ${xpPoints} XP, Level ${level}`)

    db.close()

    return { xpPoints, level }
  } catch (error) {
    console.error('❌ Error calculating XP:', error.message)
    db.close()
    throw error
  }
}
