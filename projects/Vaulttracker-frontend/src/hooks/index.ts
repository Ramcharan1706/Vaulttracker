import { useCallback, useEffect, useState } from 'react'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { useAppStore } from '../store/appStore'
import { getUserVaultState } from '../services/vaultService'
import { initializeAlgoClients } from '../services/algoClient'

const APP_ID = parseInt(import.meta.env.VITE_APP_ID || '0')

// ===== Check if APP_ID is valid (not placeholder) =====
const isValidAppId = APP_ID && APP_ID !== 0 && APP_ID !== 12345678

if (!isValidAppId && APP_ID !== 0) {
    console.warn('⚠️ Using placeholder APP_ID. Polling disabled. Deploy contract and set VITE_APP_ID to enable full functionality.')
}

// Hook to initialize Algo clients
export const useAlgoClientInit = () => {
    useEffect(() => {
        const config = {
            algodServer: import.meta.env.VITE_ALGOD_SERVER || 'http://localhost',
            algodPort: String(import.meta.env.VITE_ALGOD_PORT || '4001'),
            algodToken: import.meta.env.VITE_ALGOD_TOKEN || 'a'.repeat(64),
            indexerServer: import.meta.env.VITE_INDEXER_SERVER || 'http://localhost',
            indexerPort: String(import.meta.env.VITE_INDEXER_PORT || '8980'),
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

    const fetchUserState = useCallback(
        async (address: string) => {
            // Only fetch if address exists AND APP_ID is valid (not placeholder)
            if (!address || !isValidAppId) return

            setIsLoadingUserState(true)
            try {
                const state = await getUserVaultState(APP_ID, address)
                setUserState(state)
            } catch (e) {
                console.debug('User state fetch:', e)
            } finally {
                setIsLoadingUserState(false)
            }
        },
        [setUserState, setIsLoadingUserState]
    )

    useEffect(() => {
        // Skip polling if APP_ID is not valid
        if (!activeAddress || !isValidAppId) return

        fetchUserState(activeAddress)

        const interval = setInterval(() => {
            fetchUserState(activeAddress)
        }, refreshInterval)

        return () => clearInterval(interval)
    }, [activeAddress, refreshInterval, fetchUserState])

    return { userState, refetch: fetchUserState }
}

// Hook for app sync - simplified
export const useAppSync = () => {
    const { activeAddress } = useWallet()
    const { refetch: refetchUserState } = useSavingsState()
    const setIsLoading = useAppStore((s) => s.setIsLoading)

    const syncAll = useCallback(async () => {
        setIsLoading(true)
        try {
            if (activeAddress) {
                await refetchUserState(activeAddress)
            }
        } catch (e) {
            console.error('Error syncing app state:', e)
        } finally {
            setIsLoading(false)
        }
    }, [activeAddress, refetchUserState, setIsLoading])

    return { syncAll }
}
