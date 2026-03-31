import { useCallback, useEffect, useRef, useState } from 'react'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { useAppStore } from '../store/appStore'
import {
    getVaultAppState,
    getUserVaultState,
    optInToVault,
    getTransactionHistory,
} from '../services/vaultService'
import { initializeAlgoClients } from '../services/algoClient'

const APP_ID = parseInt(import.meta.env.VITE_APP_ID || '0')

interface AlgoConfig {
    algodServer: string
    algodPort: number
    algodToken: string
    indexerServer: string
    indexerPort: number
    indexerToken: string
}

// Hook to initialize Algo clients
export const useAlgoClientInit = () => {
    useEffect(() => {
        const config: AlgoConfig = {
            algodServer: import.meta.env.VITE_ALGOD_SERVER || 'http://localhost',
            algodPort: parseInt(import.meta.env.VITE_ALGOD_PORT || '4001'),
            algodToken: import.meta.env.VITE_ALGOD_TOKEN || 'a'.repeat(64),
            indexerServer: import.meta.env.VITE_INDEXER_SERVER || 'http://localhost',
            indexerPort: parseInt(import.meta.env.VITE_INDEXER_PORT || '8980'),
            indexerToken: import.meta.env.VITE_INDEXER_TOKEN || 'a'.repeat(64),
        }

        try {
            initializeAlgoClients(config)
        } catch (e) {
            console.error('Failed to initialize Algo clients:', e)
        }
    }, [])
}

// Hook for wallet management
export const useWalletConnection = () => {
    const { activeAddress } = useWallet()
    const walletAddress = useAppStore((s) => s.walletAddress)
    const setWalletAddress = useAppStore((s) => s.setWalletAddress)
    const setIsConnected = useAppStore((s) => s.setIsConnected)
    const { enqueueSnackbar } = useSnackbar()

    useEffect(() => {
        if (activeAddress) {
            setWalletAddress(activeAddress)
            setIsConnected(true)
            if (walletAddress !== activeAddress) {
                enqueueSnackbar('Wallet connected!', { variant: 'success' })
            }
        } else {
            setWalletAddress(null)
            setIsConnected(false)
        }
    }, [activeAddress, walletAddress, setWalletAddress, setIsConnected, enqueueSnackbar])

    return { isConnected: !!activeAddress, activeAddress }
}

// Hook for fetching user savings state
export const useSavingsState = (refreshInterval: number = 5000) => {
    const { activeAddress } = useWallet()
    const setUserState = useAppStore((s) => s.setUserState)
    const setIsLoadingUserState = useAppStore((s) => s.setIsLoadingUserState)
    const userState = useAppStore((s) => s.userState)
    const { enqueueSnackbar } = useSnackbar()

    const fetchUserState = useCallback(
        async (address: string) => {
            if (!address || APP_ID === 0) return

            setIsLoadingUserState(true)
            try {
                const state = await getUserVaultState(APP_ID, address)
                setUserState(state)
            } catch (e) {
                // User might not be opted in yet - this is normal
                console.debug('User state fetch:', e)
            } finally {
                setIsLoadingUserState(false)
            }
        },
        [setUserState, setIsLoadingUserState]
    )

    // Auto-refresh savings state
    useEffect(() => {
        if (!activeAddress) return

        fetchUserState(activeAddress)

        const interval = setInterval(() => {
            fetchUserState(activeAddress)
        }, refreshInterval)

        return () => clearInterval(interval)
    }, [activeAddress, refreshInterval, fetchUserState])

    return { userState, refetch: fetchUserState }
}

// Hook for fetching milestone configuration
export const useMilestones = () => {
    const setMilestones = useAppStore((s) => s.setMilestones)
    const setIsLoadingMilestones = useAppStore((s) => s.setIsLoadingMilestones)
    const milestones = useAppStore((s) => s.milestones)

    const fetchMilestones = useCallback(async () => {
        if (APP_ID === 0) return

        setIsLoadingMilestones(true)
        try {
            const appState = await getVaultAppState(APP_ID)
            setMilestones({
                bronze: appState.milestone1,
                silver: appState.milestone2,
                gold: appState.milestone3,
            })
        } catch (e) {
            console.error('Failed to fetch milestones:', e)
        } finally {
            setIsLoadingMilestones(false)
        }
    }, [setMilestones, setIsLoadingMilestones])

    useEffect(() => {
        fetchMilestones()
    }, [fetchMilestones])

    return { milestones, refetch: fetchMilestones }
}

// Hook for transaction history
export const useTransactionHistory = (refreshInterval: number = 30000) => {
    const { activeAddress } = useWallet()
    const setIsLoadingTransactions = useAppStore((s) => s.setIsLoadingTransactions)
    const transactions = useAppStore((s) => s.transactions)

    const fetchTransactions = useCallback(
        async (address: string) => {
            if (!address || APP_ID === 0) return

            setIsLoadingTransactions(true)
            try {
                const txns = await getTransactionHistory(address, APP_ID, 50)
                // Add to store via addTransaction
                txns.forEach((txn: any) => {
                    useAppStore.setState((state) => {
                        const exists = state.transactions.some((t) => t.txID === txn.txID)
                        if (!exists) {
                            return {
                                transactions: [
                                    {
                                        txID: txn.txID,
                                        amount: txn.amount,
                                        timestamp: txn.timestamp,
                                        status: 'confirmed',
                                    },
                                    ...state.transactions,
                                ],
                            }
                        }
                        return {}
                    })
                })
            } catch (e) {
                console.error('Failed to fetch transactions:', e)
            } finally {
                setIsLoadingTransactions(false)
            }
        },
        [setIsLoadingTransactions]
    )

    useEffect(() => {
        if (!activeAddress) return

        fetchTransactions(activeAddress)

        const interval = setInterval(() => {
            fetchTransactions(activeAddress)
        }, refreshInterval)

        return () => clearInterval(interval)
    }, [activeAddress, refreshInterval, fetchTransactions])

    return { transactions, refetch: fetchTransactions }
}

// Hook for opt-in to vault
export const useOptInToVault = () => {
    const { activeAddress, transactionSigner } = useWallet()
    const { enqueueSnackbar } = useSnackbar()
    const [isLoading, setIsLoading] = useState(false)

    const optIn = useCallback(async () => {
        if (!activeAddress || !transactionSigner || APP_ID === 0) {
            enqueueSnackbar('Wallet not connected or app not configured', { variant: 'error' })
            return undefined
        }

        setIsLoading(true)
        try {
            console.log('🔑 Initiating vault opt-in...')
            const txId = await optInToVault(APP_ID, activeAddress, transactionSigner as any)
            console.log('✅ Opted in successfully!')

            enqueueSnackbar(`Opted in successfully! TX: ${txId.slice(0, 8)}...`, {
                variant: 'success',
                autoHideDuration: 6000
            })

            // Immediately refresh state after opt-in
            console.log('🔄 Refreshing vault state...')
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('vaultStateRefresh', { detail: { userAddress: activeAddress } }))
            }, 1000)

            return txId
        } catch (e) {
            const message = (e as any).message || 'Failed to opt in to vault'
            enqueueSnackbar(message, { variant: 'error', autoHideDuration: 6000 })
            console.error('❌ Opt-in error:', e)
            return undefined
        } finally {
            setIsLoading(false)
        }
    }, [activeAddress, transactionSigner, enqueueSnackbar])

    return { optIn, isLoading }
}

// Hook for app sync - combines all data fetching
export const useAppSync = () => {
    const { activeAddress } = useWallet()
    const { userState, refetch: refetchUserState } = useSavingsState()
    const { milestones, refetch: refetchMilestones } = useMilestones()
    // Note: useTransactionHistory has its own internal polling (30s)
    // We don't call it here to avoid double-fetching from the slow indexer
    const setIsLoading = useAppStore((s) => s.setIsLoading)

    const syncAll = useCallback(async () => {
        setIsLoading(true)
        try {
            if (activeAddress) {
                // Only fetch user state and milestones
                // Transaction history is fetched separately by useTransactionHistory hook
                await Promise.all([
                    refetchUserState(activeAddress),
                    refetchMilestones(),
                ])
            }
        } catch (e) {
            console.error('Error syncing app state:', e)
        } finally {
            setIsLoading(false)
        }
    }, [
        activeAddress,
        refetchUserState,
        refetchMilestones,
        setIsLoading,
    ])

    // Get transactions from separate hook (has its own 30s polling)
    const { transactions } = useTransactionHistory()

    return { syncAll, userState, milestones, transactions }
}
