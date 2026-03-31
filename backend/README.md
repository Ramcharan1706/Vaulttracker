# Smart Vault Backend

Production-grade Node.js + SQLite backend for the Smart Vault dApp.

## Architecture

- **Express Server**: REST API for frontend integration
- **SQLite Database**: Instant data access, caching blockchain state
- **Sync Engine**: Background process that pulls data from Algorand
- **Blockchain Integration**: Uses Algosdk & Indexer for on-chain queries

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Algorand node details:
- For **LocalNet**: Keep defaults (http://localhost:4001, :8980)
- For **TestNet**: Use AlgoNode endpoints
- Set `VITE_APP_ID` to your deployed contract ID

### 3. Run Server

**Development** (with file watching):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

Server runs on `http://localhost:3001`

## API Endpoints

### Core Sync (Critical)

- **POST `/sync/:address`** - Force sync user state from blockchain
  - Called immediately after deposit/withdrawal
  - Returns: `{ userState, transactions, xp, syncedAt }`

### User Data (Instant from SQLite)

- **GET `/user/:address`** - Get user profile
  - Returns: `{ totalSaved, streakCount, xpPoints, level, ... }`
- **GET `/transactions/:address`** - Transaction history
- **GET `/goals/:address`** - Savings goals

### Admin

- **GET `/health`** - Server status
- **GET `/app/state`** - Global app milestones

## Database Schema

**users**
- address (PK)
- total_saved
- streak_count
- xp_points
- level
- last_updated

**transactions**
- tx_id (PK)
- address (FK)
- amount
- type (deposit/withdrawal)
- timestamp
- status

**goals**
- id (PK)
- address (FK)
- target_amount
- current_amount
- duration_days
- status

## Data Flow

1. **User deposits/withdraws** → Frontend creates transaction
2. **Frontend calls POST `/sync/:address`** → Backend fetches blockchain
3. **Backend queries Algorand + IndexerV2** → Gets current state
4. **Backend updates SQLite** → Instant cache
5. **Frontend reads from `/user/:address`** → Gets cached data instantly
6. **Background sync every 3s** → Detects changes automatically

## Performance Notes

- **SQLite queries**: <10ms (instant)
- **Blockchain fetch**: 1-3s (with retry logic)
- **Sync endpoint**: 2-4s total (run in background)

## Error Handling

All endpoints include:
- Retry logic for network issues
- Graceful fallbacks if blockchain is slow
- Proper error codes and messages

## Development

```bash
# Watch mode
npm run dev

# Check logs
tail -f server.log

# Reset database
rm vault.db
```

## Production Deployment

1. Use PM2 or systemd for service management
2. Configure proper CORS for frontend domain
3. Use environment-specific `.env` files
4. Monitor database size (SQLite can handle millions of records)
5. Enable proper logging and error tracking

## Support

For issues or questions, check:
- Main project README
- Frontend setup guide
- Contract deployment instructions
