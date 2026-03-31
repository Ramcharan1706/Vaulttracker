import { motion } from 'framer-motion'
import { useAppStore, useMilestoneStatus } from '../store'
import { MdMilitaryTech, MdLock, MdLockOpen } from 'react-icons/md'

interface BadgeProps {
  name: string
  icon: React.ReactNode
  color: string
  isUnlocked: boolean
  delay: number
}

const MilestoneBadge = ({ name, icon, color, isUnlocked, delay }: BadgeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative">
        {isUnlocked ? (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 150,
              damping: 10,
              delay: delay + 0.2,
            }}
            className={`p-4 rounded-full bg-gradient-to-br ${color} shadow-lg`}
          >
            <div className="text-3xl">{icon}</div>
          </motion.div>
        ) : (
          <div className="p-4 rounded-full bg-slate-700 border-2 border-slate-600 opacity-30">
            <div className="text-3xl text-slate-500">{icon}</div>
          </div>
        )}

        {/* Lock/Unlock icon */}
        <div
          className={`absolute -bottom-1 -right-1 p-1.5 rounded-full ${isUnlocked
            ? 'bg-success-500 text-white'
            : 'bg-slate-700 text-slate-500 border border-slate-600'
            }`}
        >
          {isUnlocked ? (
            <MdLockOpen size={14} />
          ) : (
            <MdLock size={14} />
          )}
        </div>
      </div>

      <h3 className="text-sm font-bold text-center">{name}</h3>
      <p className={`text-xs ${isUnlocked ? 'text-success-400' : 'text-slate-500'}`}>
        {isUnlocked ? 'Unlocked' : 'Locked'}
      </p>
    </motion.div>
  )
}

export const MilestoneBadges = () => {
  const milestoneStatus = useMilestoneStatus()
  const milestones = useAppStore((s) => s.milestones)
  const isLoadingMilestones = useAppStore((s) => s.isLoadingMilestones)

  if (isLoadingMilestones) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="card"
      >
        <div className="h-6 rounded-lg skeleton mb-6"></div>
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-lg skeleton"></div>
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="card"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary-600 bg-opacity-20">
          <MdMilitaryTech className="text-primary-400" size={24} />
        </div>
        <h2 className="text-2xl font-bold">Milestones</h2>
      </div>

      <div className="grid grid-cols-3 gap-6 py-6">
        <MilestoneBadge
          name="Bronze"
          icon="🥉"
          color="from-yellow-600 to-yellow-600"
          isUnlocked={milestoneStatus.bronze}
          delay={0}
        />
        <MilestoneBadge
          name="Silver"
          icon="🥈"
          color="from-gray-500 to-gray-400"
          isUnlocked={milestoneStatus.silver}
          delay={0.1}
        />
        <MilestoneBadge
          name="Gold"
          icon="🥇"
          color="from-yellow-400 to-yellow-300"
          isUnlocked={milestoneStatus.gold}
          delay={0.2}
        />
      </div>

      {milestones && (
        <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-400 pt-4 border-t border-slate-700">
          <div>
            <p className="font-medium text-slate-300">
              {(milestones.bronze / 1_000_000).toFixed(0)} ALGO
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-300">
              {(milestones.silver / 1_000_000).toFixed(0)} ALGO
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-300">
              {(milestones.gold / 1_000_000).toFixed(0)} ALGO
            </p>
          </div>
        </div>
      )}
    </motion.div>
  )
}
