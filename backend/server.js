import express from 'express'

import cors from 'cors'
import dotenv from 'dotenv'
import { initializeDatabase, getDatabase, closeDatabase } from './database.js'
import { syncUserState, syncTransactions, startBackgroundSync, calculateXPAndLevel } from './syncEngine.js'
import { getAppGlobalState } from './blockchain.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Initialize database on startup
initializeDatabase()
startBackgroundSync(3000) // Sync every 3 seconds

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    appId: process.env.APP_ID || 'not-configured',
  })
})


// ============================================================
// SYNC ENDPOINT (CRITICAL)
// ============================================================

/**
 * POST /sync/:address
 * Force sync user state from blockchain to SQLite
 * Called immediately after deposit/withdrawal
 */
app.post('/sync/:address', async (req, res) => {
  try {
    const { address } = req.params

    if (!address || address.length === 0) {
      return res.status(400).json({ error: 'Invalid address' })
    }

    console.log(`📡 Sync request for ${address}`)

    // Sync user state and transactions in parallel
    const [userStateResult, txnResult] = await Promise.all([
      syncUserState(address).catch((e) => ({ error: e.message })),
      syncTransactions(address).catch((e) => ({ error: e.message })),
    ])

    // Calculate XP/level
    let xpData = { xpPoints: 0, level: 1 }
    try {
      xpData = calculateXPAndLevel(address)
    } catch (e) {
      console.warn('⚠️  Could not calculate XP:', e.message)
    }

    res.json({
      success: true,
      address,
      userState: userStateResult.data || {},
      transactions: {
        syncedCount: txnResult.syncedCount || 0,
      },
      xp: xpData,
      syncedAt: Math.floor(Date.now() / 1000),
    })
  } catch (error) {
    console.error('❌ Sync error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================
// USER DATA ENDPOINTS
// ============================================================

/**
 * GET /user/:address
 * Get user state from SQLite (instant, no blockchain wait)
 */
app.get('/user/:address', (req, res) => {
  try {
    const { address } = req.params

    const db = getDatabase()

    const user = db
      .prepare(
        'SELECT address, total_saved, streak_count, xp_points, level, last_deposit_time, last_updated FROM users WHERE address = ?'
      )
      .get(address)

    db.close()

    if (!user) {
      return res.json({
        address,
        totalSaved: 0,
        streakCount: 0,
        xpPoints: 0,
        level: 1,
        lastDepositTime: 0,
        lastUpdated: 0,
      })
    }

    res.json({
      address: user.address,
      totalSaved: user.total_saved,
      streakCount: user.streak_count,
      xpPoints: user.xp_points,
      level: user.level,
      lastDepositTime: user.last_deposit_time,
      lastUpdated: user.last_updated,
    })
  } catch (error) {
    console.error('❌ Error fetching user:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================
// TRANSACTIONS ENDPOINTS
// ============================================================

/**
 * GET /transactions/:address
 * Get user's transaction history
 */
app.get('/transactions/:address', (req, res) => {
  try {
    const { address } = req.params
    const limit = parseInt(String(req.query.limit)) || 50


    const db = getDatabase()

    const transactions = db
      .prepare(
        'SELECT tx_id, amount, type, timestamp, status FROM transactions WHERE address = ? ORDER BY timestamp DESC LIMIT ?'
      )
      .all(address, limit)

    db.close()

    res.json({
      address,
      transactions: transactions || [],
      count: (transactions || []).length,
    })
  } catch (error) {
    console.error('❌ Error fetching transactions:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /transactions
 * Record a pending transaction
 */
app.post('/transactions', (req, res) => {
  try {
    const { txId, address, amount, type, timestamp } = req.body

    if (!txId || !address || !amount || !type) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const db = getDatabase()

    db.prepare(
      'INSERT INTO transactions (tx_id, address, amount, type, timestamp, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(txId, address, amount, type, timestamp || Math.floor(Date.now() / 1000), 'pending', Math.floor(Date.now() / 1000))

    db.close()

    res.status(201).json({
      success: true,
      txId,
    })
  } catch (error) {
    console.error('❌ Error recording transaction:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================
// GOALS ENDPOINTS
// ============================================================

/**
 * GET /goals/:address
 * Get user's savings goals
 */
app.get('/goals/:address', (req, res) => {
  try {
    const { address } = req.params

    const db = getDatabase()

    const goals = db
      .prepare(
        'SELECT id, target_amount, current_amount, duration_days, start_date, status FROM goals WHERE address = ? ORDER BY created_at DESC'
      )
      .all(address)

    db.close()

    res.json({
      address,
      goals: goals || [],
      count: (goals || []).length,
    })
  } catch (error) {
    console.error('❌ Error fetching goals:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /goals
 * Create a new savings goal
 */
app.post('/goals', (req, res) => {
  try {
    const { id, address, targetAmount, durationDays } = req.body

    if (!id || !address || !targetAmount || !durationDays) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const db = getDatabase()

    const now = Math.floor(Date.now() / 1000)

    db.prepare(
      'INSERT INTO goals (id, address, target_amount, duration_days, start_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, address, targetAmount, durationDays, now, 'active', now)

    db.close()

    res.status(201).json({
      success: true,
      goalId: id,
    })
  } catch (error) {
    console.error('❌ Error creating goal:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================
// APP STATE ENDPOINTS
// ============================================================

/**
 * GET /app/state
 * Get app global state (milestones)
 */
app.get('/app/state', async (req, res) => {
  try {
    const state = await getAppGlobalState()
    res.json(state)
  } catch (error) {
    console.error('❌ Error fetching app state:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(``)
  console.log(`🚀 Smart Vault Backend`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📡 Server running on http://localhost:${PORT}`)
  console.log(`🔄 Sync interval: 3000ms`)
  console.log(`📊 Database: vault.db`)
  console.log(``)
})
