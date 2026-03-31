import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store'
import { MdHistory, MdCheckCircle, MdErrorOutline, MdSchedule } from 'react-icons/md'

const MicroAlgosToAlgo = (microAlgos: number) => (microAlgos / 1_000_000).toFixed(2)

export const TransactionHistory = () => {
  const transactions = useAppStore((s) => s.transactions)
  const isLoadingTransactions = useAppStore((s) => s.isLoadingTransactions)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)

  const sortedTxns = [...transactions].sort((a, b) => b.timestamp - a.timestamp)
  const displayTxns = sortedTxns.slice(0, 10)

  if (displayTxns.length === 0 && !isLoadingTransactions) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="card"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-slate-700 bg-opacity-50">
            <MdHistory className="text-slate-400" size={24} />
          </div>
          <h2 className="text-2xl font-bold">Transaction History</h2>
        </div>

        <div className="text-center py-8">
          <p className="text-slate-400 text-lg">No transactions yet</p>
          <p className="text-slate-500 text-sm mt-2">Make your first deposit to get started!</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-slate-700 bg-opacity-50">
            <MdHistory className="text-slate-400" size={24} />
          </div>
          <h2 className="text-2xl font-bold">Transaction History</h2>
        </div>
        {isLoadingTransactions && (
          <div className="h-2 w-2 rounded-full bg-primary-400 animate-pulse"></div>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {displayTxns.map((txn, idx) => (
            <motion.div
              key={txn.txID}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ delay: idx * 0.05 }}
              className="group"
            >
              <button
                onClick={() =>
                  setExpandedTxId(expandedTxId === txn.txID ? null : txn.txID)
                }
                className="w-full text-left p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {txn.status === 'confirmed' ? (
                        <MdCheckCircle className="text-success-500" size={20} />
                      ) : txn.status === 'pending' ? (
                        <MdSchedule className="text-warning-500 animate-pulse" size={20} />
                      ) : (
                        <MdErrorOutline className="text-danger-500" size={20} />
                      )}
                    </div>

                    {/* Amount and timestamp */}
                    <div className="flex-1">
                      <p className="font-bold text-slate-100">
                        + {MicroAlgosToAlgo(txn.amount)} ALGO
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(txn.timestamp * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div
                    className={`px-2 py-1 rounded text-xs font-semibold ${txn.status === 'confirmed'
                      ? 'bg-success-500 text-white'
                      : txn.status === 'pending'
                        ? 'bg-warning-500 text-white'
                        : 'bg-danger-500 text-white'
                      }`}
                  >
                    {txn.status.charAt(0).toUpperCase() +
                      txn.status.slice(1)}
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {expandedTxId === txn.txID && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 pt-3 border-t border-slate-600 text-xs text-slate-400 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span>TX ID:</span>
                        <code className="bg-slate-800 px-2 py-1 rounded font-mono text-primary-400">
                          {txn.txID.slice(0, 8)}...{txn.txID.slice(-8)}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Amount:</span>
                        <span className="text-slate-200 font-medium">
                          {MicroAlgosToAlgo(txn.amount)} ALGO
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Time:</span>
                        <span className="text-slate-200">
                          {new Date(txn.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                      {txn.txID.startsWith('http') && (
                        <div className="mt-3 pt-3 border-t border-slate-600">
                          <a
                            href={txn.txID}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-400 hover:text-primary-300 font-medium"
                          >
                            View on Explorer →
                          </a>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {displayTxns.length < transactions.length && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Showing {displayTxns.length} of {transactions.length} transactions
          </p>
        </div>
      )}
    </motion.div>
  )
}
