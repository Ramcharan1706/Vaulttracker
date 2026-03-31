import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'vault.db')

/**
 * Initialize SQLite database with schema
 * Stores user state, transactions, and goals for instant UI performance
 */
export function initializeDatabase() {
  const db = new Database(DB_PATH)

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      address TEXT PRIMARY KEY,
      total_saved INTEGER NOT NULL DEFAULT 0,
      streak_count INTEGER NOT NULL DEFAULT 0,
      xp_points INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      last_deposit_time INTEGER NOT NULL DEFAULT 0,
      last_updated INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  // Create transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      tx_id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
      timestamp INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
      created_at INTEGER NOT NULL,
      FOREIGN KEY (address) REFERENCES users(address)
    )
  `)

  // Create index on address for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_address ON transactions(address)
  `)

  // Create goals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      target_amount INTEGER NOT NULL,
      current_amount INTEGER NOT NULL DEFAULT 0,
      duration_days INTEGER NOT NULL,
      start_date INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
      created_at INTEGER NOT NULL,
      FOREIGN KEY (address) REFERENCES users(address)
    )
  `)

  // Create milestones table
  db.exec(`
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      milestone_type TEXT NOT NULL CHECK (milestone_type IN ('bronze', 'silver', 'gold')),
      threshold_amount INTEGER NOT NULL,
      unlocked BOOLEAN NOT NULL DEFAULT 0,
      unlocked_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (address) REFERENCES users(address)
    )
  `)

  console.log(`✅ Database initialized at: ${DB_PATH}`)
  return db
}

export function getDatabase() {
  return new Database(DB_PATH)
}

export function closeDatabase(db) {
  db.close()
}
