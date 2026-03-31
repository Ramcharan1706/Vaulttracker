import { motion } from 'framer-motion'
import { useAppStore, useProgressToNextMilestone, useSavingsInAlgo } from '../store'
import { MdFlag } from 'react-icons/md'

const MicroAlgosToAlgo = (microAlgos: number) => (microAlgos / 1_000_000).toFixed(2)

export const ProgressEngine = () => {
  const progressData = useProgressToNextMilestone()
  const savingsInAlgo = useSavingsInAlgo()
  const milestones = useAppStore((s) => s.milestones)
  const isLoadingMilestones = useAppStore((s) => s.isLoadingMilestones) as boolean

  if (!milestones || isLoadingMilestones) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="card"
      >
        <div className="space-y-4">
          <div className="h-6 rounded-lg skeleton"></div>
          <div className="h-2 rounded-lg skeleton"></div>
          <div className="h-4 rounded-lg skeleton w-1/2"></div>
        </div>
      </motion.div>
    )
  }

  const nextAmount = progressData.nextAmount ? MicroAlgosToAlgo(progressData.nextAmount) : null
  const currentAmount = savingsInAlgo.toFixed(2)
  const percentage = Math.min(progressData.percentage, 100)
  const isMaxed = progressData.nextMilestone === null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="card"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-warning-500 bg-opacity-20">
          <MdFlag className="text-warning-500" size={24} />
        </div>
        <h2 className="text-2xl font-bold">Progress to Next Milestone</h2>
      </div>

      {isMaxed ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-success-500 bg-opacity-20 border border-success-500 text-center">
            <p className="text-lg font-bold text-success-500">🎉 All Milestones Unlocked!</p>
            <p className="text-sm text-success-500 mt-1">You've achieved Gold status!</p>
          </div>

          <div className="h-2 rounded-full bg-gradient-to-r from-success-600 to-success-500 w-full"></div>

          <div className="text-center">
            <p className="text-slate-400 text-sm">Total Savings</p>
            <p className="text-2xl font-bold text-success-500">{currentAmount} ALGO</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="h-3 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
              ></motion.div>
            </div>
          </div>

          {/* Progress text */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-400">Current</p>
              <p className="text-lg font-bold text-primary-400">{currentAmount} ALGO</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Next: {progressData.nextMilestone}</p>
              <p className="text-lg font-bold text-warning-400">{nextAmount} ALGO</p>
            </div>
          </div>

          {/* Percentage indicator */}
          <div className="p-3 rounded-lg bg-slate-700 flex items-center justify-between">
            <span className="text-sm text-slate-300">Progress</span>
            <span className="text-xl font-bold text-primary-400">{Math.round(percentage)}%</span>
          </div>

          {/* Remaining amount */}
          {progressData.nextAmount && (
            <div className="p-3 rounded-lg bg-primary-600 bg-opacity-10 border border-primary-500 border-opacity-30">
              <p className="text-sm text-primary-300">
                💡 Deposit {nextAmount ? (parseFloat(nextAmount) - parseFloat(currentAmount)).toFixed(2) : '0'} more ALGO to
                unlock {progressData.nextMilestone}
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
