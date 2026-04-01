import { useState, useCallback } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { motion } from 'framer-motion'
import { useAppStore } from '../store'
import { makeWithdraw } from '../services/vaultService'
import { MdSendToMobile } from 'react-icons/md'

const APP_ID = parseInt(import.meta.env.VITE_APP_ID || '0')
const isValidAppId = APP_ID && APP_ID !== 0 && APP_ID !== 12345678

export const WithdrawFlow = () => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()

  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const addTransaction = useAppStore((s) => s.addTransaction) as (txn: any) => void

  const handleWithdraw = useCallback(async () => {
    if (!isValidAppId || !activeAddress || !transactionSigner || !withdrawalAmount) {
      enqueueSnackbar('Deploy contract and set VITE_APP_ID to enable withdrawals', { variant: 'error' })
      return
    }

    const amountInAlgo = parseFloat(withdrawalAmount)
    if (isNaN(amountInAlgo) || amountInAlgo <= 0) {
      enqueueSnackbar('Enter valid amount', { variant: 'error' })
      return
    }

    if (isLoading) return

    const amountInMicroAlgos = Math.floor(amountInAlgo * 1_000_000)

    setIsLoading(true)

    try {
      const txId = await makeWithdraw(APP_ID, activeAddress, amountInMicroAlgos, transactionSigner as any)

      addTransaction({
        txID: txId,
        amount: -amountInMicroAlgos,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'confirmed',
      })

      enqueueSnackbar(`✅ Withdrawn ${amountInAlgo} ALGO!`, { variant: 'success' })
      setWithdrawalAmount('')
    } catch (e) {
      const message = (e as any).message || 'Withdrawal failed'
      console.error('❌ Withdrawal error:', e)
      enqueueSnackbar(message, { variant: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [activeAddress, transactionSigner, withdrawalAmount, addTransaction, enqueueSnackbar])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-warning-600 bg-opacity-20">
          <MdSendToMobile className="text-warning-400" size={24} />
        </div>
        <h2 className="text-2xl font-bold">Withdraw ALGO</h2>
      </div>

      <div className="space-y-4">
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
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">ALGO</span>
          </div>
        </div>

        <motion.button
          onClick={handleWithdraw}
          disabled={isLoading || !activeAddress || !withdrawalAmount}
          className="btn-warning w-full flex items-center justify-center gap-2 py-3"
        >
          {isLoading ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              Processing...
            </>
          ) : (
            <>
              <MdSendToMobile size={20} />
              Withdraw Now
            </>
          )}
        </motion.button>

        {!isValidAppId && (
          <div className="p-3 rounded-lg bg-warning-500 bg-opacity-10 border border-warning-500 text-warning-500 text-sm">
            ⚠️ Using placeholder app ID. Deploy contract and set VITE_APP_ID to enable withdrawals.
          </div>
        )}
      </div>
    </motion.div>
  )
}
