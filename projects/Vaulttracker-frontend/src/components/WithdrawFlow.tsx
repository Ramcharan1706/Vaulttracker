import { useState, useCallback } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { motion } from 'framer-motion'
import { useAppStore } from '../store'
import { makeWithdraw } from '../services/vaultService'
import { waitForTransactionConfirmation } from '../services/algoClient'
import { syncUserStateFromBackend } from '../services/backendSync'
import { MdSendToMobile, MdMoneyOff } from 'react-icons/md'

const APP_ID = parseInt(import.meta.env.VITE_APP_ID || '0')

export const WithdrawFlow = () => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()

  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // Store selectors
  const addTransaction = useAppStore((s) => s.addTransaction) as (txn: any) => void
  const updateTransaction = useAppStore((s) => s.updateTransaction) as (id: string, updates: any) => void
  const setCurrentTxnPending = useAppStore((s) => s.setCurrentTxnPending) as (pending: boolean) => void
  const setError = useAppStore((s) => s.setError) as (error: string | null) => void
  const setSuccess = useAppStore((s) => s.setSuccess) as (msg: string | null) => void

  const handleWithdraw = useCallback(async () => {
    if (APP_ID === 0) {
      enqueueSnackbar('⚠️ App not configured. Set VITE_APP_ID in .env', { variant: 'error' })
      return
    }

    if (!activeAddress || !transactionSigner || !withdrawalAmount) {
      enqueueSnackbar('Please connect wallet and enter an amount', { variant: 'warning' })
      return
    }

    // Parse and validate amount
    const amountInAlgo = parseFloat(withdrawalAmount)
    if (isNaN(amountInAlgo) || amountInAlgo <= 0) {
      enqueueSnackbar('Enter a valid amount greater than 0', { variant: 'error' })
      return
    }

    // Prevent double-click
    if (isLoading) {
      console.warn('⚠️ Withdrawal already in progress.')
      return
    }

    const amountInMicroAlgos = Math.floor(amountInAlgo * 1_000_000)

    console.log('💸 Initiating withdrawal...')
    console.log('  Amount (ALGO):', amountInAlgo)
    console.log('  Amount (microAlgos):', amountInMicroAlgos)
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
        amount: -amountInMicroAlgos, // Negative for withdrawal
        timestamp: Math.floor(Date.now() / 1000),
        status: 'pending',
      })

      console.log('📝 Pending withdrawal transaction created:', pendingTxnId)

      // Make the withdrawal
      const result = await makeWithdraw(
        APP_ID,
        activeAddress,
        amountInMicroAlgos,
        transactionSigner as any
      )

      console.log('✅ Withdrawal transaction created:', result.transactionId)

      // Update with real transaction ID
      updateTransaction(pendingTxnId, {
        txID: result.transactionId,
      })

      enqueueSnackbar('Withdrawal submitted! Waiting for confirmation...', { variant: 'info' })

      // Wait for confirmation
      console.log('⏳ Waiting for confirmation...')
      const confirmation = await Promise.race([
        waitForTransactionConfirmation(result.transactionId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout')), 90000))
      ])

      const confirmed = (confirmation as any).confirmed
      if (confirmed) {
        const round = (confirmation as any).round
        console.log('✅ Transaction confirmed at round:', round)
        updateTransaction(pendingTxnId, {
          status: 'confirmed',
          txID: result.transactionId,
        })

        const successMsg = `Withdrawal successful! ${amountInAlgo} ALGO transferred to your wallet.`
        setSuccess(successMsg)
        enqueueSnackbar(
          `Confirmed! ${amountInAlgo} ALGO withdrawn. TX: ${result.transactionId.slice(0, 8)}...`,
          { variant: 'success', autoHideDuration: 8000 }
        )

        setWithdrawalAmount('')

        // CRITICAL: Trigger backend sync immediately after confirmation
        console.log('🔄 Syncing with backend immediately...')
        try {
          await syncUserStateFromBackend(activeAddress)
        } catch (syncError) {
          console.warn('⚠️ Backend sync encountered an issue')
        }

        // CRITICAL: Trigger state refresh
        console.log('🔄 Triggering state refresh after withdrawal...')
        window.dispatchEvent(new CustomEvent('vaultStateRefresh', { detail: { userAddress: activeAddress } }))

        setTimeout(() => {
          window.location.hash = `#refetch-${Date.now()}`
        }, 500)
      } else {
        console.error('❌ Transaction confirmation timeout')
        updateTransaction(pendingTxnId, { status: 'failed' })
        setError('Confirmation timeout. Please check explorer.')
        enqueueSnackbar('Transaction may have failed. Check explorer.', { variant: 'error' })
      }
    } catch (e) {
      const message = (e as any).message || 'Failed to withdraw'
      console.error('❌ Withdrawal error:', e)
      setError(message)
      enqueueSnackbar(message, { variant: 'error', autoHideDuration: 6000 })
    } finally {
      setIsLoading(false)
      setCurrentTxnPending(false)
    }
  }, [
    activeAddress,
    transactionSigner,
    withdrawalAmount,
    addTransaction,
    updateTransaction,
    setCurrentTxnPending,
    setError,
    setSuccess,
    enqueueSnackbar,
  ])

  const handleQuickAmount = (amount: number) => {
    setWithdrawalAmount(amount.toString())
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-warning-600 bg-opacity-20">
          <MdSendToMobile className="text-warning-400" size={24} />
        </div>
        <h2 className="text-2xl font-bold">Withdraw ALGO</h2>
      </div>

      <div className="space-y-4">
        {/* Amount Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">Amount (ALGO)</label>
          <div className="relative">
            <input
              type="number"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
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

        {/* Warning Alert */}
        <div className="alert alert-warning">
          <MdMoneyOff className="text-lg" />
          <span className="text-sm">
            Withdrawals are final. Your streak will reset after withdrawal.
          </span>
        </div>

        {/* Withdraw Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleWithdraw}
          disabled={isLoading || !activeAddress || !withdrawalAmount}
          className="btn btn-warning w-full"
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Processing...
            </>
          ) : (
            <>
              <MdSendToMobile size={18} />
              Withdraw
            </>
          )}
        </motion.button>

        {/* Info */}
        <div className="text-xs text-slate-400 bg-slate-800 p-3 rounded-lg">
          <p>💡 <strong>Note:</strong> Withdrawals use smart contract inner transactions. Funds will arrive in your wallet within 30 seconds of confirmation.</p>
        </div>
      </div>
    </motion.div>
  )
}
