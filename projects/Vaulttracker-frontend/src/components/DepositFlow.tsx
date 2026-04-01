import { useState, useCallback } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { motion } from 'framer-motion'
import { useAppStore } from '../store'
import { makeDeposit, optInToApp } from '../services/vaultService'
import { MdAttachMoney, MdSendToMobile } from 'react-icons/md'

const APP_ID = parseInt(import.meta.env.VITE_APP_ID || '0')
const isValidAppId = APP_ID && APP_ID !== 0 && APP_ID !== 12345678

export const DepositFlow = () => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()

  const [depositAmount, setDepositAmount] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const addTransaction = useAppStore((s) => s.addTransaction) as (txn: any) => void

  const handleDeposit = useCallback(async () => {
    if (!isValidAppId || !activeAddress || !transactionSigner || !depositAmount) {
      enqueueSnackbar('Deploy contract and set VITE_APP_ID to enable deposits', { variant: 'error' })
      return
    }

    const amountInAlgo = parseFloat(depositAmount)
    if (isNaN(amountInAlgo) || amountInAlgo <= 0) {
      enqueueSnackbar('Enter valid amount', { variant: 'error' })
      return
    }

    if (isLoading) return

    const amountInMicroAlgos = Math.floor(amountInAlgo * 1_000_000)

    setIsLoading(true)

    try {
      // Try opt-in first (will throw if APP_ID invalid)
      try {
        await optInToApp(APP_ID, activeAddress, transactionSigner as any)
      } catch (e: any) {
        // If validation error for APP_ID, re-throw it
        if (e.message.includes('VITE_APP_ID')) {
          throw e
        }
        // Otherwise, warn and continue
        console.warn('Opt-in attempt skipped:', e)
      }

      // Make deposit (will throw if APP_ID invalid)
      const txId = await makeDeposit(APP_ID, activeAddress, amountInMicroAlgos, transactionSigner as any)

      addTransaction({
        txID: txId,
        amount: amountInMicroAlgos,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'confirmed',
      })

      enqueueSnackbar(`✅ Deposited ${amountInAlgo} ALGO!`, { variant: 'success' })
      setDepositAmount('')
    } catch (e) {
      const message = (e as any).message || 'Deposit failed'
      console.error('❌ Deposit error:', e)
      enqueueSnackbar(message, { variant: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [activeAddress, transactionSigner, depositAmount, addTransaction, enqueueSnackbar])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary-600 bg-opacity-20">
          <MdAttachMoney className="text-primary-400" size={24} />
        </div>
        <h2 className="text-2xl font-bold">Deposit ALGO</h2>
      </div>

      <div className="space-y-4">
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
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">ALGO</span>
          </div>
        </div>

        <motion.button
          onClick={handleDeposit}
          disabled={isLoading || !activeAddress || !depositAmount}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {isLoading ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              Processing...
            </>
          ) : (
            <>
              <MdSendToMobile size={20} />
              Deposit Now
            </>
          )}
        </motion.button>

        {!isValidAppId && (
          <div className="p-3 rounded-lg bg-warning-500 bg-opacity-10 border border-warning-500 text-warning-500 text-sm">
            ⚠️ Using placeholder app ID. Deploy contract and set VITE_APP_ID to enable deposits.
          </div>
        )}
      </div>
    </motion.div>
  )
}
