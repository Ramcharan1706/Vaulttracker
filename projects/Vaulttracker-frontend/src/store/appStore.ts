import { create } from 'zustand'

export interface UserState {
    totalSaved: number // in microAlgos
    streakCount: number // consecutive deposit days
    lastDepositTime: number // timestamp of last deposit
    milestonesUnlocked: number // bitmask: 1=bronze, 2=silver, 4=gold
}

export interface MilestoneConfig {
    bronze: number // in microAlgos
    silver: number
    gold: number
}

export interface TransactionRecord {
    txID: string
    amount: number // in microAlgos
    timestamp: number
    status: 'pending' | 'confirmed' | 'failed'
}

export interface AppState {
    // Wallet state
    walletAddress: string | null
    isConnected: boolean
    network: string

    // User savings state
    userState: UserState | null
    isLoadingUserState: boolean

    // Global milestone config
    milestones: MilestoneConfig | null
    isLoadingMilestones: boolean

    // Transaction state
    transactions: TransactionRecord[]
    isLoadingTransactions: boolean
    currentTxnPending: boolean

    // UI state
    error: string | null
    success: string | null
    isLoading: boolean

    // Actions
    setWalletAddress: (address: string | null) => void
    setIsConnected: (connected: boolean) => void
    setNetwork: (network: string) => void

    setUserState: (state: UserState | null) => void
    setIsLoadingUserState: (loading: boolean) => void

    setMilestones: (config: MilestoneConfig | null) => void
    setIsLoadingMilestones: (loading: boolean) => void

    addTransaction: (txn: TransactionRecord) => void
    updateTransaction: (txID: string, updates: Partial<TransactionRecord>) => void
    setIsLoadingTransactions: (loading: boolean) => void
    setCurrentTxnPending: (pending: boolean) => void
    clearTransactions: () => void

    setError: (error: string | null) => void
    setSuccess: (success: string | null) => void
    setIsLoading: (loading: boolean) => void
    clearMessages: () => void

    reset: () => void
}

const initialState = {
    walletAddress: null,
    isConnected: false,
    network: 'localnet',
    userState: null,
    isLoadingUserState: false,
    milestones: null,
    isLoadingMilestones: false,
    transactions: [],
    isLoadingTransactions: false,
    currentTxnPending: false,
    error: null,
    success: null,
    isLoading: false,
}

export const useAppStore = create<AppState>((set) => ({
    ...initialState,

    setWalletAddress: (address) => set({ walletAddress: address }),
    setIsConnected: (connected) => set({ isConnected: connected }),
    setNetwork: (network) => set({ network }),

    setUserState: (state) => set({ userState: state }),
    setIsLoadingUserState: (loading) => set({ isLoadingUserState: loading }),

    setMilestones: (config) => set({ milestones: config }),
    setIsLoadingMilestones: (loading) => set({ isLoadingMilestones: loading }),

    addTransaction: (txn) =>
        set((state) => ({
            transactions: [txn, ...state.transactions],
        })),

    updateTransaction: (txID, updates) =>
        set((state) => ({
            transactions: state.transactions.map((txn) =>
                txn.txID === txID ? { ...txn, ...updates } : txn
            ),
        })),

    setIsLoadingTransactions: (loading) => set({ isLoadingTransactions: loading }),
    setCurrentTxnPending: (pending) => set({ currentTxnPending: pending }),
    clearTransactions: () => set({ transactions: [] }),

    setError: (error) => set({ error }),
    setSuccess: (success) => set({ success }),
    setIsLoading: (loading) => set({ isLoading: loading }),

    clearMessages: () =>
        set({
            error: null,
            success: null,
        }),

    reset: () => set(initialState),
}))

// Computed selectors
export const useIsOptedIn = () => {
    const userState = useAppStore((state) => state.userState)
    return userState !== null
}

export const useProgressToNextMilestone = () => {
    const userState = useAppStore((state) => state.userState)
    const milestones = useAppStore((state) => state.milestones)

    if (!userState || !milestones) return { percentage: 0, nextMilestone: null }

    const { totalSaved, milestonesUnlocked } = userState

    if (milestonesUnlocked & 4) {
        // Gold unlocked - they've achieved all
        return { percentage: 100, nextMilestone: null, milestone: 'gold' }
    }

    if (milestonesUnlocked & 2) {
        // Silver unlocked, working toward gold
        const progress = ((totalSaved - milestones.silver) / (milestones.gold - milestones.silver)) * 100
        return {
            percentage: Math.min(progress, 100),
            nextMilestone: 'Gold',
            nextAmount: milestones.gold,
            current: milestones.gold,
            milestone: 'silver',
        }
    }

    if (milestonesUnlocked & 1) {
        // Bronze unlocked, working toward silver
        const progress = ((totalSaved - milestones.bronze) / (milestones.silver - milestones.bronze)) * 100
        return {
            percentage: Math.min(progress, 100),
            nextMilestone: 'Silver',
            nextAmount: milestones.silver,
            current: milestones.silver,
            milestone: 'bronze',
        }
    }

    // No milestones unlocked yet, working toward bronze
    const progress = (totalSaved / milestones.bronze) * 100
    return {
        percentage: Math.min(progress, 100),
        nextMilestone: 'Bronze',
        nextAmount: milestones.bronze,
        current: milestones.bronze,
        milestone: 'none',
    }
}

export const useMilestoneStatus = () => {
    const userState = useAppStore((state) => state.userState)

    if (!userState) {
        return {
            bronze: false,
            silver: false,
            gold: false,
        }
    }

    return {
        bronze: !!(userState.milestonesUnlocked & 1),
        silver: !!(userState.milestonesUnlocked & 2),
        gold: !!(userState.milestonesUnlocked & 4),
    }
}

export const useSavingsInAlgo = () => {
    const totalSaved = useAppStore((state) => state.userState?.totalSaved ?? 0)
    return totalSaved / 1_000_000
}

// ============================================================
// STREAK TRACKING (NEW)
// ============================================================

export const useStreakStatus = () => {
    const userState = useAppStore((state) => state.userState)

    if (!userState || userState.streakCount === 0) {
        return {
            count: 0,
            isActive: false,
            daysUntilReset: 0,
        }
    }

    // 24-hour window = 86400 seconds
    const now = Math.floor(Date.now() / 1000)
    const timeSinceLastDeposit = now - userState.lastDepositTime
    const twentyFourHours = 86400
    const daysUntilReset = Math.ceil((twentyFourHours - timeSinceLastDeposit) / 86400)

    const isActive = timeSinceLastDeposit <= twentyFourHours

    return {
        count: userState.streakCount,
        isActive,
        daysUntilReset: Math.max(0, daysUntilReset),
    }
}

// ============================================================
// TIME-LOCK STATUS (NEW)
// ============================================================

export const useLockStatus = () => {
    const userState = useAppStore((state) => state.userState)

    if (!userState || userState.vaultUnlockTime === 0) {
        return {
            isLocked: false,
            unlockTime: 0,
            secondsRemaining: 0,
            unlocksIn: 'No lock',
        }
    }

    const now = Math.floor(Date.now() / 1000)
    const secondsRemaining = Math.max(0, userState.vaultUnlockTime - now)
    const isLocked = secondsRemaining > 0

    // Format time remaining
    let unlocksIn = ''
    if (secondsRemaining > 0) {
        const days = Math.floor(secondsRemaining / 86400)
        const hours = Math.floor((secondsRemaining % 86400) / 3600)
        const minutes = Math.floor((secondsRemaining % 3600) / 60)

        if (days > 0) {
            unlocksIn = `${days}d ${hours}h`
        } else if (hours > 0) {
            unlocksIn = `${hours}h ${minutes}m`
        } else {
            unlocksIn = `${minutes}m`
        }
    } else {
        unlocksIn = 'Unlocked'
    }

    return {
        isLocked,
        unlockTime: userState.vaultUnlockTime,
        secondsRemaining,
        unlocksIn,
    }
}
