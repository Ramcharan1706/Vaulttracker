import { useState, useCallback } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { motion } from 'framer-motion'
import { useAppStore } from '../store'
import { makeDeposit } from '../services/vaultService'
import { waitForTransactionConfirmation } from '../services/algoClient'
import { syncUserStateFromBackend } from '../services/backendSync'
import { MdAttachMoney, MdSendToMobile, MdLock } from 'react-icons/md'

// Note: APP_ID is also imported from the top of hooks/index.ts
const APP_ID = parseInt(import.meta.env.VITE_APP_ID || '0')

// Lock duration presets (in seconds)
const LOCK_DURATIONS = {
  none: 0,
  oneDay: 86400,
  oneWeek: 86400 * 7,
  twoWeeks: 86400 * 14,
  oneMonth: 86400 * 30,
}

type LockDurationKey = keyof typeof LOCK_DURATIONS

export const DepositFlow = () => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()

  const [depositAmount, setDepositAmount] = useState<string>('')
  const [lockDuration, setLockDuration] = useState<LockDurationKey>('none')
  const [isLoading, setIsLoading] = useState(false)

  // Properly typed store selectors
  const addTransaction = useAppStore((s) => s.addTransaction) as (txn: any) => void
  const updateTransaction = useAppStore((s) => s.updateTransaction) as (id: string, updates: any) => void
  const setCurrentTxnPending = useAppStore((s) => s.setCurrentTxnPending) as (pending: boolean) => void
  const setError = useAppStore((s) => s.setError) as (error: string | null) => void
  const setSuccess = useAppStore((s) => s.setSuccess) as (msg: string | null) => void

  const handleDeposit = useCallback(async () => {
    if (APP_ID === 0) {
      enqueueSnackbar('⚠️ App not configured. Set VITE_APP_ID in .env and restart dev server', { variant: 'error' })
      return
    }

    if (!activeAddress || !transactionSigner || !depositAmount) {
      enqueueSnackbar('Please connect wallet and enter an amount', { variant: 'warning' })
      return
    }

    // Parse and validate amount
    const amountInAlgo = parseFloat(depositAmount)
    if (isNaN(amountInAlgo) || amountInAlgo <= 0) {
      enqueueSnackbar('Enter a valid amount greater than 0', { variant: 'error' })
      return
    }

    if (amountInAlgo > 10000000) { // Sanity check - 10M ALGO is unrealistic
      enqueueSnackbar('Amount seems too high. Please verify.', { variant: 'warning' })
      return
    }

    // CRITICAL: Prevent double-click/double-submit
    if (isLoading) {
      console.warn('⚠️ Deposit already in progress. Ignoring duplicate request.')
      return
    }

    const amountInMicroAlgos = Math.floor(amountInAlgo * 1_000_000)
    const lockDurationSeconds = LOCK_DURATIONS[lockDuration]

    console.log('💰 Initiating deposit...')
    console.log('  Amount (ALGO):', amountInAlgo)
    console.log('  Amount (microAlgos):', amountInMicroAlgos)
    console.log('  Lock Duration (seconds):', lockDurationSeconds)
    console.log('  User Address:', activeAddress)

    setIsLoading(true)
    setCurrentTxnPending(true)
    setError(null)
    setSuccess(null)

    try {
      // Create pending transaction record
      const pendingTxnId = `pending-${Date.now()}`
      addTransaction({
        txID: pendingTxnId,
        amount: amountInMicroAlgos,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'pending',
      })

      console.log('📝 Pending transaction created:', pendingTxnId)

      // Make the deposit with lock duration
      const result = await makeDeposit(
        APP_ID,
        activeAddress,
        amountInMicroAlgos,
        lockDurationSeconds,
        transactionSigner as any
      )

      console.log('✅ Deposit transaction created:', result.groupTransactionId)

      // Update with real transaction ID
      updateTransaction(pendingTxnId, {
        txID: result.groupTransactionId,
      })

      enqueueSnackbar('Deposit submitted! Waiting for confirmation...', { variant: 'info' })

      // Wait for confirmation with timeout
      console.log('⏳ Waiting for confirmation (may take up to 15 seconds)...')
      const confirmation = await Promise.race([
        waitForTransactionConfirmation(result.groupTransactionId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout')), 90000))
      ])

      const confirmed = (confirmation as any).confirmed
      if (confirmed) {
        const round = (confirmation as any).round
        console.log('✅ Transaction confirmed at round:', round)
        updateTransaction(pendingTxnId, {
          status: 'confirmed',
          txID: result.groupTransactionId,
        })

        let successMsg = `Deposit successful! ${amountInAlgo} ALGO saved.`
        if (lockDurationSeconds > 0) {
          const days = Math.floor(lockDurationSeconds / 86400)
          successMsg += ` 🔒 Locked for ${days} day${days !== 1 ? 's' : ''}.`
        }

        setSuccess(successMsg)
        enqueueSnackbar(
          `Confirmed! ${amountInAlgo} ALGO deposited. TX: ${result.groupTransactionId.slice(0, 8)}...`,
          { variant: 'success', autoHideDuration: 8000 }
        )

        setDepositAmount('')
        setLockDuration('none')

        // CRITICAL: Trigger backend sync immediately after confirmation
        console.log('🔄 Syncing with backend immediately...')
        try {
          await syncUserStateFromBackend(activeAddress)
        } catch (syncError) {
          console.warn('⚠️ Backend sync encountered an issue')
        }

        // CRITICAL: Immediate state refresh after successful deposit
        console.log('🔄 Triggering immediate state refresh...')
        // Signal parent component to refresh (they have the hooks)
        window.dispatchEvent(new CustomEvent('vaultStateRefresh', { detail: { userAddress: activeAddress } }))

        // Also trigger hash change for any listeners
        setTimeout(() => {
          window.location.hash = `#refetch-${Date.now()}`
        }, 500)
      } else {
        console.error('❌ Transaction confirmation timeout')
        updateTransaction(pendingTxnId, { status: 'failed' })
        setError('Transaction confirmation timeout. Please check transaction status in explorer.')
        enqueueSnackbar('Transaction may have failed or timed out. Please check explorer.', { variant: 'error' })
      }
    } catch (e) {
      const message = (e as any).message || 'Failed to deposit'
      console.error('❌ Deposit error:', e)
      setError(message)
      enqueueSnackbar(message, { variant: 'error', autoHideDuration: 6000 })
    } finally {
      setIsLoading(false)
      setCurrentTxnPending(false)
    }
  }, [
    activeAddress,
    transactionSigner,
    depositAmount,
    lockDuration,
    addTransaction,
    updateTransaction,
    setCurrentTxnPending,
    setError,
    setSuccess,
    enqueueSnackbar,
  ])

  const handleQuickAmount = (amount: number) => {
    setDepositAmount(amount.toString())
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary-600 bg-opacity-20">
          <MdAttachMoney className="text-primary-400" size={24} />
        </div>
        <h2 className="text-2xl font-bold">Deposit ALGO</h2>
      </div>

      <div className="space-y-4">
        {/* Amount Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">Amount (ALGO)</label>
          <div className="relative">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              disabled={isLoading || !activeAddress}
              placeholder="0.00"
              className="input-field"
              min="0"
              step="0.1"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
              ALGO
            </span>
          </div>
        </div>

        {/* Quick Amounts */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 5, 10].map((amount) => (
            <button
              key={amount}
              onClick={() => handleQuickAmount(amount)}
              disabled={isLoading || !activeAddress}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {amount} ALGO
            </button>
          ))}
        </div>

        {/* Lock Duration Selector */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <MdLock size={16} />
            Time-Lock Duration (Optional)
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(LOCK_DURATIONS) as LockDurationKey[]).map((key) => {
              const labels = {
                none: 'No Lock',
                oneDay: '1 Day',
                oneWeek: '1 Week',
                twoWeeks: '2 Weeks',
                oneMonth: '1 Month',
              }

              return (
                <motion.button
                  key={key}
                  onClick={() => setLockDuration(key)}
                  disabled={isLoading || !activeAddress}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${lockDuration === key
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {labels[key]}
                </motion.button>
              )
            })}
          </div>
          {lockDuration !== 'none' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-primary-300 mt-2"
            >
              🔒 Funds will be locked and cannot be withdrawn for this period. Perfect for building discipline!
            </motion.p>
          )}
        </div>

        {/* Deposit Button */}
        <motion.button
          onClick={handleDeposit}
          disabled={isLoading || !activeAddress || !depositAmount}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-lg"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              Processing...
            </>
          ) : (
            <>
              <MdSendToMobile size={20} />
              Deposit Now
            </>
          )}
        </motion.button>

        {APP_ID === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-lg bg-danger-500 bg-opacity-10 border border-danger-500 text-danger-500 text-sm"
          >
            ⚠️ App ID not configured! Update <code className="bg-danger-600 px-1 rounded">VITE_APP_ID</code> in .env with deployed contract ID
          </motion.div>
        )}

        {!activeAddress && APP_ID !== 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-lg bg-warning-500 bg-opacity-10 border border-warning-500 text-warning-500 text-sm"
          >
            Connect your wallet to make a deposit
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
