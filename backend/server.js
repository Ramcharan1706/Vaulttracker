import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Backend is running - all state is on-chain',
  })
})

// ============================================================
// SIMPLE SYNC ENDPOINT (stub)
// ============================================================

/**
 * POST /sync/:address
 * Stub endpoint - returns success
 * (All state is fetched directly from Algorand blockchain)
 */
app.post('/sync/:address', async (req, res) => {
  try {
    const { address } = req.params
    if (!address) {
      return res.status(400).json({ error: 'Invalid address' })
    }
    res.json({
      success: true,
      address,
      message: 'State is managed on-chain. Fetch directly from blockchain via algosdk.'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ============================================================
// DEFAULT ROUTE
// ============================================================

app.get('/', (req, res) => {
  res.json({
    message: 'Vaulttracker Backend',
    version: '2.0',
    note: 'All transaction and state data is stored on the Algorand blockchain',
    endpoints: {
      health: 'GET /health',
      sync: 'POST /sync/:address',
    }
  })
})

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error('Backend error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`)
  console.log(`📡 All state is managed on-chain (Algorand testnet)`)
})
