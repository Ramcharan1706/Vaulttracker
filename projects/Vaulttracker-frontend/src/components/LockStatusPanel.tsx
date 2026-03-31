import { motion } from 'framer-motion'
import { useAppStore, useLockStatus } from '../store'
import { MdLock, MdLockOpen } from 'react-icons/md'
import { useEffect, useState } from 'react'

export const LockStatusPanel = () => {
  const lock = useLockStatus()
  const isLoadingUserState = useAppStore((s) => s.isLoadingUserState) as boolean
  const [timeRemaining, setTimeRemaining] = useState(lock.unlocksIn)

  // Update countdown timer
  useEffect(() => {
    if (!lock.isLocked) return

    const timer = setInterval(() => {
      // Recalculate from current time
      const now = Math.floor(Date.now() / 1000)
      const secondsRemaining = Math.max(0, lock.unlockTime - now)

      if (secondsRemaining > 0) {
        const days = Math.floor(secondsRemaining / 86400)
        const hours = Math.floor((secondsRemaining % 86400) / 3600)
        const minutes = Math.floor((secondsRemaining % 3600) / 60)
        const seconds = secondsRemaining % 60

        let display = ''
        if (days > 0) {
          display = `${days}d ${hours}h ${minutes}m`
        } else if (hours > 0) {
          display = `${hours}h ${minutes}m ${seconds}s`
        } else if (minutes > 0) {
          display = `${minutes}m ${seconds}s`
        } else {
          display = `${seconds}s`
        }
        setTimeRemaining(display)
      } else {
        setTimeRemaining('Unlocked!')
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [lock.isLocked, lock.unlockTime])

  if (isLoadingUserState) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="card"
      >
        <div className="h-6 rounded-lg skeleton mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 rounded-lg skeleton w-2/3"></div>
          <div className="h-6 rounded-lg skeleton"></div>
        </div>
      </motion.div>
    )
  }

  if (!lock.isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="card"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-success-500 bg-opacity-20">
            <MdLockOpen className="text-success-500" size={24} />
          </div>
          <h2 className="text-2xl font-bold">Vault Status</h2>
        </div>

        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-5xl"
          >
            🔓
          </motion.div>
          <p className="text-lg font-bold text-success-400">Funds Accessible</p>
          <p className="text-sm text-slate-400">
            Your savings are not locked. You can withdraw anytime.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="card"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-warning-500 bg-opacity-20">
          <MdLock className="text-warning-500" size={24} />
        </div>
        <h2 className="text-2xl font-bold">Vault Locked 🔒</h2>
      </div>

      <div className="space-y-4">
        {/* Countdown Timer */}
        <div className="p-4 rounded-lg bg-slate-700 border border-slate-600">
          <p className="text-xs text-slate-400 mb-2">Time Remaining</p>
          <motion.p
            key={timeRemaining}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-bold text-warning-400 font-mono"
          >
            {timeRemaining}
          </motion.p>
        </div>

        {/* Lock Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-3 rounded-lg bg-warning-500 bg-opacity-10 border border-warning-500 border-opacity-30"
        >
          <p className="text-sm text-warning-400">
            🛡️ Your funds are secure and cannot be withdrawn until the timer expires.
          </p>
        </motion.div>

        {/* Unlock Date */}
        <div className="text-center">
          <p className="text-xs text-slate-400">Unlocks on</p>
          <p className="text-sm font-medium">
            {new Date(lock.unlockTime * 1000).toLocaleDateString()} at{' '}
            {new Date(lock.unlockTime * 1000).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Discipline Incentive */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 p-3 rounded-lg bg-primary-600 bg-opacity-10 border border-primary-500 border-opacity-30"
      >
        <p className="text-xs text-primary-300">
          💡 Time-locking enforces discipline. Great way to build long-term wealth!
        </p>
      </motion.div>
    </motion.div>
  )
}
