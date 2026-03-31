import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore, useSavingsInAlgo } from '../store'
import { MdTrendingUp } from 'react-icons/md'

interface AnimatedCounterProps {
  value: number
  decimals?: number
  duration?: number
}

const AnimatedCounter = ({ value, decimals = 2, duration = 1 }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationId: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)

      setDisplayValue(value * progress)

      if (progress < 1) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [value, duration])

  return <span>{displayValue.toFixed(decimals)}</span>
}

export const SavingsDashboard = () => {
  const userState = useAppStore((s) => s.userState)
  const isLoadingUserState = useAppStore((s) => s.isLoadingUserState)
  const savingsInAlgo = useSavingsInAlgo()

  const lastDepositTime = userState?.lastDepositTime || 0
  const lastDepositDate = lastDepositTime ? new Date(lastDepositTime * 1000).toLocaleDateString() : 'Never'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-success-500 bg-opacity-20">
            <MdTrendingUp className="text-success-500" size={24} />
          </div>
          <h2 className="text-2xl font-bold">Your Savings</h2>
        </div>
        {isLoadingUserState && (
          <div className="h-2 w-2 rounded-full bg-primary-400 animate-pulse"></div>
        )}
      </div>

      {userState ? (
        <div className="space-y-4">
          {/* Main savings amount */}
          <div className="space-y-2">
            <p className="text-slate-400 text-sm font-medium">Total Saved</p>
            <div className="text-5xl font-bold text-gradient flex items-baseline gap-2">
              <AnimatedCounter value={savingsInAlgo} decimals={2} duration={0.8} />
              <span className="text-2xl text-slate-400 font-normal">ALGO</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-700">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Deposits Made</p>
              <p className="text-lg font-bold text-primary-400">{userState.totalSaved > 0 ? '1+' : '0'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Last Deposit</p>
              <p className="text-sm font-medium">{lastDepositDate}</p>
            </div>
          </div>

          {/* Progress info */}
          <div className="p-3 rounded-lg bg-primary-600 bg-opacity-10 border border-primary-500 border-opacity-30">
            <p className="text-sm text-primary-300">
              💰 Your savings are secured in a non-custodial smart contract on Algorand
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Skeleton loaders */}
          <div className="space-y-2">
            <p className="text-slate-400 text-sm font-medium">Total Saved</p>
            <div className="h-12 rounded-lg skeleton"></div>
          </div>
          <div className="space-y-2">
            <p className="text-slate-400 text-sm font-medium">Status</p>
            <div className="h-6 rounded-lg skeleton"></div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
