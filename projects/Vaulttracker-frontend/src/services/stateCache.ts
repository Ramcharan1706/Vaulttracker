/**
 * Enhanced State Caching Service
 *
 * Provides a robust cache layer for vault state and transactions
 * Uses localStorage for fast fallback, with blockchain as source of truth
 *
 * Can be upgraded to SQLite backend later
 */

interface CachedUserState {
    address: string
    totalSaved: number
    lastDepositTime: number
    milestonesUnlocked: number
    streakCount: number
    vaultUnlockTime: number
    lastFetchedAt: number // Cache timestamp
}

interface CachedTransaction {
    txID: string
    amount: number
    timestamp: number
    status: 'pending' | 'confirmed' | 'failed'
    cachedAt: number
}

interface CacheMetadata {
    lastSync: number
    syncVersion: number
}

const CACHE_KEYS = {
    USER_STATE: (address: string) => `vault_user_state_${address}`,
    TRANSACTIONS: (address: string) => `vault_transactions_${address}`,
    MILESTONES: 'vault_milestones',
    METADATA: 'vault_cache_metadata',
}

const CACHE_TTL = {
    USER_STATE: 30 * 1000,      // 30 seconds
    TRANSACTIONS: 60 * 1000,    // 1 minute
    MILESTONES: 5 * 60 * 1000,  // 5 minutes
}

/**
 * Check if a cached value is still valid (not expired)
 */
function isValidCache(cachedAt: number, ttl: number): boolean {
    return Date.now() - cachedAt < ttl
}

/**
 * Get cached user state if valid
 */
export function getCachedUserState(address: string): CachedUserState | null {
    try {
        const cached = localStorage.getItem(CACHE_KEYS.USER_STATE(address))
        if (!cached) return null

        const state = JSON.parse(cached) as CachedUserState

        // Check if cache is still valid
        if (!isValidCache(state.lastFetchedAt, CACHE_TTL.USER_STATE)) {
            console.log('⏰ User state cache expired')
            clearCachedUserState(address)
            return null
        }

        console.log('✅ Using cached user state (age:', Math.floor((Date.now() - state.lastFetchedAt) / 1000), 's)')
        return state
    } catch (e) {
        console.warn('Error reading cached user state:', e)
        return null
    }
}

/**
 * Cache user state
 */
export function setCachedUserState(address: string, state: Omit<CachedUserState, 'lastFetchedAt'>): void {
    try {
        const cacheData: CachedUserState = {
            ...state,
            lastFetchedAt: Date.now(),
        }
        localStorage.setItem(CACHE_KEYS.USER_STATE(address), JSON.stringify(cacheData))
        console.log('💾 User state cached')
    } catch (e) {
        console.warn('Error caching user state:', e)
    }
}

/**
 * Clear cached user state
 */
export function clearCachedUserState(address: string): void {
    try {
        localStorage.removeItem(CACHE_KEYS.USER_STATE(address))
    } catch (e) {
        console.warn('Error clearing cached user state:', e)
    }
}

/**
 * Get cached transactions
 */
export function getCachedTransactions(address: string): CachedTransaction[] {
    try {
        const cached = localStorage.getItem(CACHE_KEYS.TRANSACTIONS(address))
        if (!cached) return []

        const txns = JSON.parse(cached) as CachedTransaction[]

        // Check if cache is still valid
        if (txns.length > 0 && !isValidCache(txns[0].cachedAt, CACHE_TTL.TRANSACTIONS)) {
            console.log('⏰ Transaction cache expired')
            clearCachedTransactions(address)
            return []
        }

        console.log('✅ Using cached transactions (', txns.length, 'txns)')
        return txns
    } catch (e) {
        console.warn('Error reading cached transactions:', e)
        return []
    }
}

/**
 * Add or update cached transaction
 */
export function updateCachedTransaction(address: string, txn: CachedTransaction): void {
    try {
        const txns = getCachedTransactions(address)

        // Remove if already exists
        const filtered = txns.filter(t => t.txID !== txn.txID)

        // Add with cache timestamp
        const updated: CachedTransaction = {
            ...txn,
            cachedAt: Date.now(),
        }

        // Keep most recent 100 transactions
        const all = [updated, ...filtered].slice(0, 100)

        localStorage.setItem(CACHE_KEYS.TRANSACTIONS(address), JSON.stringify(all))
    } catch (e) {
        console.warn('Error updating cached transaction:', e)
    }
}

/**
 * Clear cached transactions
 */
export function clearCachedTransactions(address: string): void {
    try {
        localStorage.removeItem(CACHE_KEYS.TRANSACTIONS(address))
    } catch (e) {
        console.warn('Error clearing cached transactions:', e)
    }
}

/**
 * Get cached milestones
 */
export function getCachedMilestones(): { bronze: number; silver: number; gold: number } | null {
    try {
        const cached = localStorage.getItem(CACHE_KEYS.MILESTONES)
        if (!cached) return null

        const data = JSON.parse(cached) as any

        if (!isValidCache(data.cachedAt, CACHE_TTL.MILESTONES)) {
            console.log('⏰ Milestones cache expired')
            clearCachedMilestones()
            return null
        }

        console.log('✅ Using cached milestones')
        return { bronze: data.bronze, silver: data.silver, gold: data.gold }
    } catch (e) {
        console.warn('Error reading cached milestones:', e)
        return null
    }
}

/**
 * Cache milestones
 */
export function setCachedMilestones(milestones: { bronze: number; silver: number; gold: number }): void {
    try {
        const cacheData = {
            ...milestones,
            cachedAt: Date.now(),
        }
        localStorage.setItem(CACHE_KEYS.MILESTONES, JSON.stringify(cacheData))
        console.log('💾 Milestones cached')
    } catch (e) {
        console.warn('Error caching milestones:', e)
    }
}

/**
 * Clear cached milestones
 */
export function clearCachedMilestones(): void {
    try {
        localStorage.removeItem(CACHE_KEYS.MILESTONES)
    } catch (e) {
        console.warn('Error clearing cached milestones:', e)
    }
}

/**
 * Clear all cache for an address (useful when disconnecting)
 */
export function clearAllCache(address: string): void {
    try {
        clearCachedUserState(address)
        clearCachedTransactions(address)
        console.log('🧹 All cache cleared for address:', address)
    } catch (e) {
        console.warn('Error clearing all cache:', e)
    }
}

/**
 * Get cache hit statistics
 */
export function getCacheStats(): {
    userStateHits: number
    transactionHits: number
} {
    try {
        const metadata = localStorage.getItem(CACHE_KEYS.METADATA)
        if (!metadata) {
            return { userStateHits: 0, transactionHits: 0 }
        }
        return JSON.parse(metadata)
    } catch (e) {
        return { userStateHits: 0, transactionHits: 0 }
    }
}

/**
 * Increment cache hit counter
 */
export function recordCacheHit(type: 'userState' | 'transactions'): void {
    try {
        const stats = getCacheStats()
        if (type === 'userState') {
            stats.userStateHits++
        } else {
            stats.transactionHits++
        }
        localStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(stats))
    } catch (e) {
        console.warn('Error recording cache hit:', e)
    }
}
