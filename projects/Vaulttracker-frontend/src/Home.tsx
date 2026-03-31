import { useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { motion } from 'framer-motion'
import { useAlgoClientInit, useWalletConnection, useAppSync } from './hooks'
import { WalletConnector } from './components/WalletConnector'
import { DepositFlow } from './components/DepositFlow'
import { WithdrawFlow } from './components/WithdrawFlow'
import { SavingsDashboard } from './components/SavingsDashboard'
import { ProgressEngine } from './components/ProgressEngine'
import { MilestoneBadges } from './components/MilestoneBadges'
import { StreakTracker } from './components/StreakTracker'
import { LockStatusPanel } from './components/LockStatusPanel'
import { TransactionHistory } from './components/TransactionHistory'
import { useAppStore } from './store'
import { MdStorefront } from 'react-icons/md'
import { getConfigStatus } from './utils/configValidator'

const Home = () => {
  const isConnected = useAppStore((s) => s.isConnected)
  useAlgoClientInit()
  useWalletConnection()
  const { syncAll } = useAppSync()

  // Sync data on connection or interval
  useEffect(() => {
    if (!isConnected) return

    // Initial sync immediately
    syncAll()

    // Regular sync every 30 seconds
    const interval = setInterval(syncAll, 30000)
    return () => clearInterval(interval)
  }, [isConnected, syncAll])

  // CRITICAL: Listen for immediate refresh after deposits
  useEffect(() => {
    const handleVaultRefresh = async (event: any) => {
      console.log('🔄 Received vault refresh signal')
      // Immediate refresh (don't wait for next 30s interval)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second for blockchain to process
      syncAll()
    }

    window.addEventListener('vaultStateRefresh', handleVaultRefresh)

    // Also listen for hash changes (fallback mechanism)
    const handleHashChange = () => {
      if (window.location.hash.startsWith('#refetch-')) {
        console.log('🔄 Detected hash refresh signal')
        setTimeout(syncAll, 500)
      }
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('vaultStateRefresh', handleVaultRefresh)
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [syncAll])

  const error = useAppStore((s) => s.error)
  const success = useAppStore((s) => s.success)
  const configStatus = getConfigStatus()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Configuration Warning */}
      {!configStatus.isConfigured && (
        <div className="bg-red-900 border-b-2 border-red-700 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-red-100">
              <span className="text-xl">⚙️</span>
              <p className="text-sm font-medium">{configStatus.message}</p>
            </div>
            <p className="text-xs text-red-200 mt-2 ml-7">
              📖 Follow the deployment guide in the project README to get started.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-slate-700 bg-slate-900 bg-opacity-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600">
                <MdStorefront className="text-white" size={28} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Savings Vault</h1>
                <p className="text-xs text-slate-400">Non-custodial Savings on Algorand</p>
              </div>
            </motion.div>

            <WalletConnector />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
          >
            {/* Welcome Section */}
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl sm:text-5xl font-bold text-gradient mb-4">
                  Build Your Savings Habit
                </h2>
                <p className="text-lg text-slate-300 mb-6">
                  A gamified, non-custodial savings application on Algorand. Connect your wallet,
                  deposit ALGO, and unlock milestone badges as you reach savings goals.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-1">💰</div>
                  <div>
                    <h3 className="font-bold text-slate-100">Non-Custodial</h3>
                    <p className="text-sm text-slate-400">Your funds are secured in a smart contract, never held by us</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-1">🎯</div>
                  <div>
                    <h3 className="font-bold text-slate-100">Milestone Tracking</h3>
                    <p className="text-sm text-slate-400">Unlock Bronze, Silver, and Gold badges as you save</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-1">⛓️</div>
                  <div>
                    <h3 className="font-bold text-slate-100">Blockchain-Driven</h3>
                    <p className="text-sm text-slate-400">All data stored on-chain for transparency and security</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connected Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="card "
            >
              <div className="text-center space-y-4">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-bold">Connect Your Wallet</h3>
                <p className="text-slate-400">
                  Connect with Pera Wallet to start saving and earning rewards
                </p>
                <div className="pt-4">
                  <WalletConnector />
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          // Dashboard Grid
          <div className="space-y-8">
            {/* Status Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-lg bg-danger-500 bg-opacity-20 border border-danger-500 text-danger-400"
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-lg bg-success-500 bg-opacity-20 border border-success-500 text-success-400"
              >
                {success}
              </motion.div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-8">
                <SavingsDashboard />
                <ProgressEngine />
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                <DepositFlow />
                <WithdrawFlow />
                <StreakTracker />
                <LockStatusPanel />
              </div>
            </div>

            {/* Milestones */}
            <MilestoneBadges />

            {/* Transaction History */}
            <TransactionHistory />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-slate-400">
            <p>Savings Vault Tracker © 2024 | Powered by Algorand</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <a href="#" className="hover:text-primary-400 transition-colors">
                Docs
              </a>
              <a href="#" className="hover:text-primary-400 transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-primary-400 transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home
