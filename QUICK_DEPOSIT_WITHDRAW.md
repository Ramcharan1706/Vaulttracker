# Quick Deposit & Withdraw Guide

## TL;DR - 3 Steps to Deposit

### Step 1: Opt-In (ONE TIME ONLY)
```tsx
import { optInToApp } from './services/vaultService'

const txId = await optInToApp(APP_ID, userAddress, transactionSigner)
// Wait for confirmation
```

### Step 2: Deposit
```tsx
import { makeDeposit } from './services/vaultService'

const result = await makeDeposit(
  APP_ID,           // Your app ID
  userAddress,      // User's wallet address
  1000000,          // Amount in microAlgos (0.001 ALGO = 1000 microAlgos)
  0,                // Lock duration in seconds (0 = no lock)
  transactionSigner // From @txnlab/use-wallet-react
)

console.log('Deposit submitted:', result.groupTransactionId)

// Wait for confirmation
import { waitForTransactionConfirmation } from './services/algoClient'
await waitForTransactionConfirmation(result.groupTransactionId)
```

### Step 3: Withdraw
```tsx
import { makeWithdraw } from './services/vaultService'

const result = await makeWithdraw(
  APP_ID,           // Your app ID
  userAddress,      // User's wallet address
  500000,           // Amount in microAlgos to withdraw
  transactionSigner // From @txnlab/use-wallet-react
)

console.log('Withdrawal submitted:', result.transactionId)

// Wait for confirmation
import { waitForTransactionConfirmation } from './services/algoClient'
await waitForTransactionConfirmation(result.transactionId)
```

## Error Handling

```tsx
try {
  const result = await makeDeposit(APP_ID, address, amount, 0, signer)
  await waitForTransactionConfirmation(result.groupTransactionId)
  console.log('✅ Deposit confirmed!')
} catch (error) {
  if (error.message.includes('404')) {
    console.log('Network error - check if algod is running')
  } else if (error.message.includes('rejected')) {
    console.log('User rejected in wallet')
  } else if (error.message.includes('App ID')) {
    console.log('App ID not configured - set VITE_APP_ID')
  } else {
    console.log('Error:', error.message)
  }
}
```

## Amount Conversion

```
1 ALGO = 1,000,000 microAlgos

0.001 ALGO = 1,000 microAlgos
0.1 ALGO = 100,000 microAlgos
1 ALGO = 1,000,000 microAlgos
10 ALGO = 10,000,000 microAlgos
```

## Lock Duration Examples

```
0 = No lock (immediate access)
3600 = 1 hour
86400 = 1 day
604800 = 1 week
2592000 = 30 days
```

## In React Component

```tsx
import { useWallet } from '@txnlab/use-wallet-react'
import { makeDeposit, makeWithdraw } from '../services/vaultService'
import { waitForTransactionConfirmation } from '../services/algoClient'

const APP_ID = parseInt(import.meta.env.VITE_APP_ID || '0')

export function MyVault() {
  const { activeAddress, transactionSigner } = useWallet()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  async function handleDeposit() {
    if (!activeAddress || !transactionSigner) {
      setStatus('Connect wallet first')
      return
    }

    try {
      setLoading(true)
      setStatus('Submitting...')

      // Convert 1 ALGO to microAlgos
      const amount = 1_000_000

      const result = await makeDeposit(
        APP_ID,
        activeAddress,
        amount,
        0, // no lock
        transactionSigner
      )

      setStatus('Waiting for confirmation...')

      const confirmation = await waitForTransactionConfirmation(
        result.groupTransactionId
      )

      if ((confirmation as any).confirmed) {
        setStatus('✅ Deposit successful!')
      } else {
        setStatus('❌ Deposit failed or timed out')
      }
    } catch (error) {
      setStatus(`❌ Error: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleDeposit} disabled={loading}>
        {loading ? 'Processing...' : 'Deposit 1 ALGO'}
      </button>
      <p>{status}</p>
    </div>
  )
}
```

## No Opt-In? You'll Get This Error:

```
ApplicationError: app instance 12345678 not found in account
```

**Solution:** Call `optInToApp()` first

## Network 404 Error? You'll Get This:

```
Failed to fetch transaction parameters: Network request error. Received status 404
```

**Solution:**
1. Check algod is running: `nc -zv localhost 4001`
2. Verify VITE_ALGOD_SERVER in .env.local
3. Restart dev server: `npm run dev`

## That's It!

Simple, direct, no magic. Just:
1. Opt-in once
2. Deposit
3. Withdraw

No complex retry logic, no hidden state management, no mystery 404 errors.
