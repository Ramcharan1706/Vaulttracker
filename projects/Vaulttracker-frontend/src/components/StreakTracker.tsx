import { motion } from 'framer-motion'
import { useAppStore, useStreakStatus } from '../store'
import { MdLocalFireDepartment } from 'react-icons/md'

export const StreakTracker = () => {
  const streak = useStreakStatus()
  const isLoadingUserState = useAppStore((s) => s.isLoadingUserState) as boolean

  if (isLoadingUserState) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="card"
      >
        <div className="h-6 rounded-lg skeleton mb-4"></div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full skeleton"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded-lg skeleton w-1/2"></div>
            <div className="h-3 rounded-lg skeleton w-2/3"></div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="card"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-orange-500 bg-opacity-20">
          <MdLocalFireDepartment className="text-orange-500" size={24} />
        </div>
        <h2 className="text-2xl font-bold">Streak 🔥</h2>
      </div>

      <div className="flex items-center justify-between">
        {/* Flame Animation */}
        <motion.div
          animate={{ scale: streak.isActive ? [1, 1.1, 1] : 1 }}
          transition={{
            duration: 1.5,
            repeat: streak.isActive ? Infinity : 0,
          }}
          className="flex items-center gap-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-6xl"
          >
            🔥
          </motion.div>

          <div>
            <motion.p
              key={streak.count}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-5xl font-bold text-orange-500"
            >
              {streak.count}
            </motion.p>
            <p className="text-sm text-slate-400">days</p>
          </div>
        </motion.div>

        {/* Status Info */}
        <div className="text-right">
          {streak.isActive ? (
            <>
              <p className="text-sm text-slate-400">Keep it up!</p>
              <motion.div
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-base font-bold text-orange-400 mt-1"
              >
                ✨ Streak Active
              </motion.div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400">Deposited</p>
              <p className="text-base font-bold text-slate-300 mt-1">
                {streak.count > 0 ? `${streak.count} day${streak.count !== 1 ? 's' : ''}` : 'Start today!'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Reset Warning */}
      {streak.isActive && streak.daysUntilReset > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 rounded-lg bg-orange-500 bg-opacity-10 border border-orange-500 border-opacity-30"
        >
          <p className="text-xs text-orange-400">
            ⚠️ Streak resets in {streak.daysUntilReset} day{streak.daysUntilReset !== 1 ? 's' : ''} if you don't deposit
          </p>
        </motion.div>
      )}

      {/* Achievement Message */}
      {streak.count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-3 rounded-lg bg-success-500 bg-opacity-10 border border-success-500 border-opacity-30"
        >
          <p className="text-sm text-success-400">
            🎉 Incredible discipline! {streak.count === 1 ? 'Start' : 'Continue'} building your savings habit.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
