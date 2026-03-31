import { Algodv2, Transaction, AtomicTransactionComposer, makePaymentTxnWithSuggestedParamsFromObject, makeApplicationCallTxnFromObject, modelsv2, SuggestedParams, assignGroupID } from 'algosdk'
import { getAlgodClient, getIndexerClient, getApplicationAddress, waitForTransactionConfirmation } from './algoClient'
import {
    getCachedUserState,
    setCachedUserState,
    getCachedMilestones,
    setCachedMilestones,
    clearCachedUserState,
    recordCacheHit
} from './stateCache'

// ============================================================
// HELPER: Fetch with Retry (handles slow/unreliable nodes)
// ============================================================

// ============================================================
// HELPER: Normalize SuggestedParams (handle number/bigint conversion)
// ============================================================

function normalizeSuggestedParams(params: SuggestedParams): SuggestedParams {
    return {
        ...params,
        firstValid: typeof params.firstValid === 'bigint' ? Number(params.firstValid) : params.firstValid,
        lastValid: typeof params.lastValid === 'bigint' ? Number(params.lastValid) : params.lastValid,
        minFee: typeof params.minFee === 'bigint' ? Number(params.minFee) : params.minFee,
        flatFee: typeof (params as any).flatFee === 'bigint' ? Number((params as any).flatFee) : (params as any).flatFee,
        fee: typeof (params as any).fee === 'bigint' ? Number((params as any).fee) : (params as any).fee,
    } as SuggestedParams
}

/**
 * Fetch with exponential backoff retry
 * Handles slow public nodes that occasionally timeout
 */
async function fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    description: string,
    maxRetries: number = 3,
    timeoutMs: number = 30000
): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📡 ${description} (attempt ${attempt}/${maxRetries})...`)

            const result = await Promise.race([
                fetchFn(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
                )
            ])

            console.log(`✅ ${description} succeeded`)
            return result
        } catch (e) {
            lastError = e as Error
            const errorMsg = lastError.message

            if (attempt < maxRetries) {
                // Calculate backoff: 2s, 4s, 8s
                const backoffMs = Math.pow(2, attempt) * 1000
                console.warn(`⚠️  Attempt ${attempt} failed: ${errorMsg}`)
                console.warn(`   Retrying in ${backoffMs}ms...`)

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, backoffMs))
            } else {
                console.error(`❌ All ${maxRetries} attempts failed: ${errorMsg}`)
            }
        }
    }

    throw lastError || new Error('Unknown error')
}

// Type for the transactionSigner function from use-wallet-react
type WalletTransactionSigner = (txnGroup: Transaction[], indexesToSign: number[]) => Promise<Uint8Array[]>

function extractTxId(sendResult: unknown): string {
    if (typeof sendResult === 'string') return sendResult

    if (sendResult && typeof sendResult === 'object') {
        const candidate = sendResult as { txId?: unknown; txid?: unknown }
        if (typeof candidate.txId === 'string' && candidate.txId.length > 0) return candidate.txId
        if (typeof candidate.txid === 'string' && candidate.txid.length > 0) return candidate.txid
    }

    throw new Error(`Unable to extract txId from network response: ${JSON.stringify(sendResult)}`)
}

// ============================================================
// VAULT STATE INTERFACES
// ============================================================

export interface VaultAppState {
    milestone1: number
    milestone2: number
    milestone3: number
}

export interface UserVaultState {
    totalSaved: number
    lastDepositTime: number
    milestonesUnlocked: number      // bitmask: 1=bronze, 2=silver, 4=gold
    streakCount: number              // new: consecutive deposit days
    vaultUnlockTime: number           // new: when locked funds can be withdrawn
}

export interface StreakStatus {
    count: number
    isActive: boolean
    daysUntilReset: number
}

export interface LockStatus {
    isLocked: boolean
    unlockTime: number
    secondsRemaining: number
    unlocksIn: string // formatted time string
}

// ============================================================
// FETCH: VAULT APP STATE (GLOBAL)
// ============================================================

export const getVaultAppState = async (appId: number): Promise<VaultAppState> => {
if (appId === 0) {
        // Placeholder or unconfigured app ID
        console.warn('⚙️ App ID not properly configured:', appId)
        throw new Error(
            `⚙️ App ID not configured properly (${appId}). You need to deploy the contract. ` +
            `See QUICK_START.md for deployment instructions.`
        )
    }

    try {
        // Try to use cached milestones first
        const cached = getCachedMilestones()
        if (cached) {
            recordCacheHit('userState')
            return {
                milestone1: cached.bronze,
                milestone2: cached.silver,
                milestone3: cached.gold,
            }
        }

        console.log('📊 Fetching vault app state for App ID:', appId)
        const client = getAlgodClient()
        const appInfo = await client.getApplicationByID(appId).do()

        const globalState = appInfo.params.globalState || []

        const parseState = (key: string) => {
            const entry = globalState.find((s: any) => s.key === btoa(key))
            if (!entry) return 0
            const value = entry.value.type === 1 ? entry.value.uint : 0
            return typeof value === 'bigint' ? Number(value) : value
        }

        const milestone1 = parseState('milestone_1')
        const milestone2 = parseState('milestone_2')
        const milestone3 = parseState('milestone_3')

        console.log('✅ App state fetched:')
        console.log('  Milestone 1 (Bronze):', milestone1 / 1e6, 'ALGO')
        console.log('  Milestone 2 (Silver):', milestone2 / 1e6, 'ALGO')
        console.log('  Milestone 3 (Gold):', milestone3 / 1e6, 'ALGO')

        // Cache the milestones
        setCachedMilestones({
            bronze: milestone1,
            silver: milestone2,
            gold: milestone3,
        })

        return {
            milestone1,
            milestone2,
            milestone3,
        }
    } catch (e) {
        const errorMsg = (e as any)?.message || String(e)

        // More graceful 404 handling
        if (errorMsg.includes('404') || errorMsg.includes('does not exist')) {
            console.error('❌ Contract not deployed on this network. App ID:', appId)
            console.error('   Deploy using: ./deploy.bat (or check QUICK_START.md)')
            throw new Error(`⚙️ Contract not found on network (App ID: ${appId}). See QUICK_START.md for deployment.`)
        }

        console.error('❌ Error fetching vault app state:', errorMsg)
        throw e
    }
}

// ============================================================
// FETCH: USER VAULT STATE (LOCAL)
// ============================================================

export const getUserVaultState = async (
    appId: number,
    userAddress: string
): Promise<UserVaultState | null> => {
    if (appId === 0) {
        throw new Error('App ID not configured. Please deploy the contract and update VITE_APP_ID in .env')
    }

    if (!userAddress) {
        throw new Error('User address required')
    }

    try {
        // Try cache first for faster response
        const cached = getCachedUserState(userAddress)
        if (cached) {
            recordCacheHit('userState')
            return {
                totalSaved: cached.totalSaved,
                lastDepositTime: cached.lastDepositTime,
                milestonesUnlocked: cached.milestonesUnlocked,
                streakCount: cached.streakCount,
                vaultUnlockTime: cached.vaultUnlockTime,
            }
        }

        console.log('👤 Fetching user vault state for:', userAddress)
        const client = getAlgodClient()
        const accountInfo = await client.accountApplicationInformation(userAddress, appId).do()

        const appLocalState = accountInfo.appLocalState
        const keyValue = appLocalState?.keyValue || []

        const parseState = (key: string) => {
            const entry = keyValue.find((s: any) => s.key === btoa(key))
            if (!entry) return 0
            const value = entry.value.type === 1 ? entry.value.uint : 0
            return typeof value === 'bigint' ? Number(value) : value
        }

        const state: UserVaultState = {
            totalSaved: parseState('total_saved'),
            lastDepositTime: parseState('last_deposit_time'),
            milestonesUnlocked: parseState('milestones_unlocked'),
            streakCount: parseState('streak_count'),
            vaultUnlockTime: parseState('vault_unlock_time'),
        }

        console.log('✅ User state fetched:')
        console.log('  Total Saved:', state.totalSaved / 1e6, 'ALGO')
        console.log('  Last Deposit Time:', new Date(state.lastDepositTime * 1000).toLocaleString())
        console.log('  Milestones Unlocked:', state.milestonesUnlocked)
        console.log('  Streak Count:', state.streakCount, 'days')
        console.log('  Vault Unlock Time:', state.vaultUnlockTime === 0 ? 'No lock' : new Date(state.vaultUnlockTime * 1000).toLocaleString())

        // Cache the state
        setCachedUserState(userAddress, { address: userAddress, ...state })

        return state
    } catch (e) {
        // User hasn't opted in yet
        if ((e as any).status === 404) {
            console.log('⚠️  User not opted in yet')
            // Clear any stale cache
            clearCachedUserState(userAddress)
            return null
        }
        console.error('❌ Error fetching user vault state:', e)
        throw e
    }
}

// ============================================================
// DEPOSITS WITH TIME-LOCK
// ============================================================

export const makeDeposit = async (
    appId: number,
    userAddress: string,
    depositAmount: number,
    lockDurationSeconds: number,  // NEW: seconds to lock funds (0 = no lock)
    signer: WalletTransactionSigner
): Promise<{ groupTransactionId: string; txIds: string[] }> => {
    // ========================
    // VALIDATION
    // ========================
    if (appId === 0) {
        throw new Error('❌ App ID not configured. Please deploy the contract and update VITE_APP_ID in .env')
    }

    if (!userAddress || !signer) {
        throw new Error('❌ User address and transaction signer are required')
    }

    if (depositAmount <= 0) {
        throw new Error('❌ Deposit amount must be greater than 0')
    }

    if (lockDurationSeconds < 0) {
        throw new Error('❌ Lock duration cannot be negative')
    }

    try {
        const client = getAlgodClient()

// Preflight: skip if appId === 0 (undeployed)
        if (appId !== 0) {
            try {
                await client.accountApplicationInformation(userAddress, appId).do()
            } catch (e) {
                const status = (e as any)?.status
                if (status === 404) {
                    throw new Error('❌ Wallet not opted in to this app. Please opt in first, then try deposit again.')
                }
                throw new Error(`❌ Failed to verify opt-in status: ${(e as any)?.message || String(e)}`)
            }
        }

        // Fetch suggested params with automatic retry on timeout
        let params: SuggestedParams
        try {
            console.log('⏳ Fetching transaction parameters from network...')
            // Try with increasing timeouts: 30s, then 40s, then 50s total
            params = await fetchWithRetry(
                () => client.getTransactionParams().do() as Promise<SuggestedParams>,
                'Fetching transaction parameters',
                2,  // max 2 retries
                30000  // 30s timeout per attempt
            )
            console.log('✅ Parameters fetched:', {
                firstRound: params.firstValid,
                lastRound: params.lastValid,
                minFee: params.minFee,
                types: {
                    firstValid: typeof params.firstValid,
                    lastValid: typeof params.lastValid,
                    minFee: typeof params.minFee
                }
            })
        } catch (e) {
            const errorMsg = (e as any).message || String(e)
            throw new Error(`❌ Failed to fetch transaction parameters after retries: ${errorMsg}`)
        }

        // Validate params - firstValid can be number or bigint
        if (!params || !params.minFee || (typeof params.firstValid !== 'number' && typeof params.firstValid !== 'bigint')) {
            console.error('❌ Invalid params received:', { params, firstValid: params?.firstValid, minFee: params?.minFee })
            throw new Error('❌ Invalid or incomplete transaction parameters from node')
        }

        // Normalize params to ensure consistent types for transaction builders
        params = normalizeSuggestedParams(params)

        const appAddress = getApplicationAddress(appId)

        console.log('======== 📝 DEPOSIT TRANSACTION BUILD ========')
        console.log('📋 Request Details:')
        console.log('  💰 User Address:', userAddress)
        console.log('  🏛️  App Address:', appAddress)
        console.log('  💵 Deposit Amount:', depositAmount, '(microAlgos) =', depositAmount / 1e6, 'ALGO')
        console.log('  🔒 Lock Duration:', lockDurationSeconds === 0 ? 'None' : `${lockDurationSeconds}s`)
        console.log('  📱 App ID:', appId)
        console.log('')
        console.log('🔍 Network Params:')
        console.log('  First Round:', params.firstValid)
        console.log('  Last Round:', params.lastValid)
        console.log('  Min Fee (microAlgos):', params.minFee)
        console.log('')

        // Transaction 0: Payment from user to app escrow
        let paymentTxn
        try {
            paymentTxn = makePaymentTxnWithSuggestedParamsFromObject({
                sender: userAddress,
                receiver: appAddress,
                amount: depositAmount,
                suggestedParams: params,
            })
            console.log('✅ Payment Txn created')
            console.log('  - From:', userAddress)
            console.log('  - To:', appAddress)
            console.log('  - Amount:', depositAmount)
        } catch (e) {
            throw new Error(`❌ Failed to create payment transaction: ${(e as any).message}`)
        }

        // Get fresh params for the next transaction with timeout and retry
        let params2: SuggestedParams
        try {
            params2 = await fetchWithRetry(
                () => client.getTransactionParams().do() as Promise<SuggestedParams>,
                'Fetching params for second transaction',
                2,
                30000
            )
            // Normalize the fresh params
            params2 = normalizeSuggestedParams(params2)
        } catch (e) {
            console.warn('⚠️ Could not fetch fresh params for second transaction, using modified params')
            // Use first params as fallback, just bump firstValid
            const firstValidNum = typeof params.firstValid === 'bigint' ? Number(params.firstValid) : params.firstValid
            const lastValidNum = typeof params.lastValid === 'bigint' ? Number(params.lastValid) : params.lastValid
            params2 = {
                ...params,
                firstValid: firstValidNum + 1,
                lastValid: lastValidNum + 1,
            }
        }

        // Transaction 1: App call to deposit method with optional lock duration
        const appArgs: Uint8Array[] = [
            new Uint8Array(Buffer.from('deposit')),
        ]

        // If lock duration specified, add it as second arg (encoded as 8-byte big-endian)
        if (lockDurationSeconds > 0) {
            const lockDurationBuffer = Buffer.alloc(8)
            lockDurationBuffer.writeBigUInt64BE(BigInt(lockDurationSeconds))
            appArgs.push(new Uint8Array(lockDurationBuffer))
            console.log('🔒 Lock duration arg encoded:', lockDurationBuffer.toString('hex'), '=', lockDurationSeconds, 'seconds')
        }

        console.log('📋 App Call Details:')
        console.log('  - Method: deposit')
        console.log('  - App Args:', appArgs.length, 'args')
        console.log('  - OnComplete: NoOp')
        console.log('')

        let appCallTxn
        try {
            appCallTxn = makeApplicationCallTxnFromObject({
                sender: userAddress,
                suggestedParams: params2,
                appIndex: appId,
                onComplete: 0, // 0 = OnComplete.NoOp (no state change)
                appArgs: appArgs,
            })
            console.log('✅ App Call Txn created')
        } catch (e) {
            throw new Error(`❌ Failed to create application call transaction: ${(e as any).message}`)
        }

        console.log('')
        console.log('🔗 GROUPED TRANSACTION DETAILS:')
        console.log('  - Txn[0]: Payment (user → app escrow)')
        console.log('  - Txn[1]: AppCall (deposit method)')
        console.log('  - Group Size: 2')
        console.log('')
        console.log('📤 Submitting to wallet for signing (may take 30-120s)...')
        console.log('')

        // Build and execute grouped transaction with retry logic
        let result
        try {
            result = await fetchWithRetry(
                async () => {
                    // Create an array of the transactions in the correct order
                    const txnsToGroup: Transaction[] = [paymentTxn, appCallTxn]

                    console.log('🔗 Grouping transactions...')
                    // Assign group ID to both transactions
                    const groupedTxns = assignGroupID(txnsToGroup)

                    console.log('✅ Transactions grouped')

                    console.log('🔐 Requesting wallet signature...')
                    // Sign both transactions using the wallet signer function
                    // transactionSigner is a function that takes (txnGroup, indexesToSign)
                    // It returns an array of signed transaction bytes
                    const signedTxnsArray = await signer(groupedTxns, [0, 1])

                    console.log('✅ Transactions signed, submitting...')

                    // Concatenate all signed transaction bytes into a single Uint8Array
                    let totalLength = 0
                    for (const signedTxn of signedTxnsArray) {
                        totalLength += signedTxn.length
                    }

                    const concatenatedTxns = new Uint8Array(totalLength)
                    let offset = 0
                    for (const signedTxn of signedTxnsArray) {
                        concatenatedTxns.set(signedTxn, offset)
                        offset += signedTxn.length
                    }

                    // Submit the signed transactions to the network
                    console.log('📡 Sending to network...')
                    const sendResult = await client.sendRawTransaction(concatenatedTxns).do()
                    const txId = extractTxId(sendResult)

                    console.log('✅ Transaction submitted with ID:', txId)

                    return {
                        txIDs: [txId],
                        confirmed: true
                    }
                },
                'Submitting grouped transaction',
                3,  // max 3 attempts
                50000  // 50s timeout per attempt
            )

            console.log('✅ TRANSACTION SUBMITTED SUCCESSFULLY!')
            console.log('  Primary TX ID:', (result as any).txIDs[0])
            console.log('  All TX IDs:', (result as any).txIDs)
            console.log('  Waiting for confirmation...')
            console.log('')

            return {
                groupTransactionId: (result as any).txIDs[0],
                txIds: (result as any).txIDs,
            }
        } catch (e) {
            const errorMsg = (e as any).message || String(e)
            if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
                throw new Error('❌ Network became unavailable during transaction submission. Your wallet may still be processing - check again in a moment.')
            }
            if (errorMsg.includes('User rejected')) {
                throw new Error('❌ Transaction was cancelled in your wallet.')
            }
            throw new Error(`❌ Failed to submit transaction after retries: ${errorMsg}`)
        }
    } catch (e) {
        const errorMessage = (e as any).message || String(e)

        console.error('')
        console.error('❌ ========== DEPOSIT FAILED ==========')
        console.error('Error:', errorMessage)

        // Provide specific error guidance
        if (errorMessage.includes('balance')) {
            console.error('💡 Solution: Check your wallet balance. Ensure you have enough ALGO for the deposit + fees.')
        } else if (errorMessage.includes('insufficient')) {
            console.error('💡 Solution: Your wallet has insufficient balance. Add more ALGO to your account.')
        } else if (errorMessage.includes('timeout')) {
            console.error('💡 Solution: Network timeout. Check your internet connection and try again.')
        } else if (errorMessage.includes('rejected')) {
            console.error('💡 Solution: Transaction was rejected. Check your wallet and try again.')
        } else if (errorMessage.includes('opted in')) {
            console.error('💡 Solution: Opt in your wallet to the app first, then retry deposit.')
        } else if (errorMessage.includes('App ID')) {
            console.error('💡 Solution: App not deployed yet. Deploy the contract first and update VITE_APP_ID.')
        }

        console.error('Full error:', e)
        console.error('=====================================')
        console.error('')

        throw new Error(`Deposit failed: ${errorMessage}`)
    }
}

// ============================================================
// WITHDRAWAL (CRITICAL - INNER TRANSACTIONS)
// ============================================================

export const makeWithdraw = async (
    appId: number,
    userAddress: string,
    withdrawalAmount: number,
    signer: WalletTransactionSigner
): Promise<{ transactionId: string; status: string }> => {
    // ========================
    // VALIDATION
    // ========================
    if (appId === 0) {
        throw new Error('❌ App ID not configured. Please deploy the contract and update VITE_APP_ID in .env')
    }

    if (!userAddress || !signer) {
        throw new Error('❌ User address and transaction signer are required')
    }

    if (withdrawalAmount <= 0) {
        throw new Error('❌ Withdrawal amount must be greater than 0')
    }

    try {
        const client = getAlgodClient()

        // Verify user is opted in
        try {
            await client.accountApplicationInformation(userAddress, appId).do()
        } catch (e) {
            const status = (e as any)?.status
            if (status === 404) {
                throw new Error('❌ Wallet not opted in to this app. Please opt in first.')
            }
            throw new Error(`❌ Failed to verify opt-in status: ${(e as any)?.message || String(e)}`)
        }

        // Fetch suggested params
        let params: SuggestedParams
        try {
            console.log('⏳ Fetching transaction parameters...')
            params = await fetchWithRetry(
                () => client.getTransactionParams().do() as Promise<SuggestedParams>,
                'Fetching transaction parameters',
                2,
                30000
            )
        } catch (e) {
            throw new Error(`❌ Failed to fetch transaction parameters: ${(e as any).message}`)
        }

        params = normalizeSuggestedParams(params)

        console.log('======== 💸 WITHDRAWAL TRANSACTION BUILD ========')
        console.log('📋 Request Details:')
        console.log('  💰 User Address:', userAddress)
        console.log('  💵 Withdrawal Amount:', withdrawalAmount, '(microAlgos) =', withdrawalAmount / 1e6, 'ALGO')
        console.log('  📱 App ID:', appId)
        console.log('')

        // Build withdrawal app call with inner transaction
        const appArgs: Uint8Array[] = [
            new Uint8Array(Buffer.from('withdraw')),
            // Encode withdrawal amount as 8-byte big-endian
            new Uint8Array(Buffer.from(
                withdrawalAmount.toString(16).padStart(16, '0'),
                'hex'
            ))
        ]

        console.log('📋 App Call Details:')
        console.log('  - Method: withdraw')
        console.log('  - Amount arg: ', withdrawalAmount, 'microAlgos')
        console.log('  - App Args:', appArgs.length, 'args')
        console.log('')

        let txn
        try {
            txn = makeApplicationCallTxnFromObject({
                sender: userAddress,
                suggestedParams: params,
                appIndex: appId,
                onComplete: 0, // 0 = OnComplete.NoOp
                appArgs: appArgs,
            })
            console.log('✅ Withdrawal Txn created')
        } catch (e) {
            throw new Error(`❌ Failed to create withdrawal transaction: ${(e as any).message}`)
        }

        console.log('')
        console.log('📤 Submitting to wallet for signing...')

        // Submit for signing and execution
        let result
        try {
            result = await fetchWithRetry(
                async () => {
                    console.log('🔐 Requesting wallet signature...')
                    const signedTxnsArray = await signer([txn], [0])

                    console.log('✅ Transaction signed, submitting...')
                    const sendResult = await client.sendRawTransaction(signedTxnsArray[0]).do()
                    const txId = extractTxId(sendResult)

                    console.log('✅ Transaction submitted with ID:', txId)

                    return {
                        txIDs: [txId],
                        confirmed: true
                    }
                },
                'Submitting withdrawal transaction',
                3,
                50000
            )

            console.log('✅ WITHDRAWAL SUBMITTED SUCCESSFULLY!')
            console.log('  Transaction ID:', (result as any).txIDs[0])

            return {
                transactionId: (result as any).txIDs[0],
                status: 'submitted',
            }
        } catch (e) {
            const errorMsg = (e as any).message || String(e)
            if (errorMsg.includes('insufficient')) {
                throw new Error('❌ Contract app account has insufficient balance. Contact administrator.')
            }
            if (errorMsg.includes('User rejected')) {
                throw new Error('❌ Transaction was cancelled in your wallet.')
            }
            throw new Error(`❌ Failed to submit withdrawal: ${errorMsg}`)
        }
    } catch (e) {
        const errorMessage = (e as any).message || String(e)

        console.error('')
        console.error('❌ ========== WITHDRAWAL FAILED ==========')
        console.error('Error:', errorMessage)

        if (errorMessage.includes('insufficient')) {
            console.error('💡 Solution: Insufficient balance in your vault or app account.')
        } else if (errorMessage.includes('locked')) {
            console.error('💡 Solution: Your funds are still locked. Wait until unlock time.')
        } else if (errorMessage.includes('rejected')) {
            console.error('💡 Solution: Transaction was rejected. Check your wallet.')
        } else if (errorMessage.includes('opted in')) {
            console.error('💡 Solution: Opt in to the app first, then retry.')
        }

        console.error('Full error:', e)
        console.error('==========================================')
        console.error('')

        throw new Error(`Withdrawal failed: ${errorMessage}`)
    }
}

// ============================================================
// OPT-IN TO VAULT
// ============================================================

export const optInToVault = async (
    appId: number,
    userAddress: string,
    signer: WalletTransactionSigner
): Promise<string> => {
    if (appId === 0) {
        throw new Error('❌ App ID not configured. Cannot opt in.')
    }

    if (!userAddress) {
        throw new Error('❌ User address is required')
    }

    try {
        console.log('📝 Initiating opt-in to vault...')
        console.log('  User Address:', userAddress)
        console.log('  App ID:', appId)

        const client = getAlgodClient()
        let params: SuggestedParams

        try {
            params = await fetchWithRetry(
                () => client.getTransactionParams().do() as Promise<SuggestedParams>,
                'Fetching params for opt-in',
                2,
                30000
            )
        } catch (e) {
            throw new Error(`❌ Failed to fetch transaction parameters: ${(e as any).message}`)
        }

        if (!params) {
            throw new Error('❌ Invalid transaction parameters from node')
        }

        params = normalizeSuggestedParams(params)

        let txn
        try {
            txn = makeApplicationCallTxnFromObject({
                sender: userAddress,
                suggestedParams: params,
                appIndex: appId,
                onComplete: 1, // 1 = OnComplete.OptIn
            })
        } catch (e) {
            throw new Error(`❌ Failed to create opt-in transaction: ${(e as any).message}`)
        }

        console.log('📤 Submitting opt-in transaction...')

        const atc = new AtomicTransactionComposer()
        atc.addTransaction({ txn, signer: signer as any })

        const result = await fetchWithRetry(
            () => atc.execute(client, 2),
            'Submitting opt-in',
            2,
            50000
        )

        const txId = (result as any).txIDs[0]
        console.log('✅ Opt-in transaction submitted:', txId)
        console.log('⏳ Waiting for confirmation...')

        await Promise.race([
            waitForTransactionConfirmation(txId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout (>90s)')), 90000))
        ])

        console.log('✅ Opt-in confirmed!')
        return txId
    } catch (e) {
        const errorMsg = (e as any).message || String(e)
        console.error('❌ Opt-in error:', errorMsg)
        throw new Error(`Opt-in failed: ${errorMsg}`)
    }
}

export const getTransactionHistory = async (
    userAddress: string,
    appId: number,
    limit: number = 50
) => {
    try {
        console.log('📜 Fetching transaction history...')
        const indexer = getIndexerClient()

        // Fetch transactions from the user to the app escrow
        const appAddress = getApplicationAddress(appId)

        // Add timeout to indexer (which can be very slow)
        const response = await Promise.race([
            indexer
                .searchForTransactions()
                .address(userAddress)
                .addressRole('sender')
                .applicationID(appId)
                .limit(limit)
                .do(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Indexer timeout (>10s)')), 10000)
            )
        ])

        const transactions = (response as any).transactions || []
        console.log('✅ Fetched', transactions.length, 'transactions')

        return transactions
            .filter((txn: any) => txn['app-call']?.['application-id'] === appId)
            .map((txn: any) => {
                const paymentTxn = txn['payment'] || {}
                const confirmRound = txn['confirmed-round']

                return {
                    txID: txn.id,
                    amount: paymentTxn.amount || 0,
                    timestamp: txn['round-time'] || 0,
                    round: confirmRound,
                    type: txn.type,
                }
            })
    } catch (e) {
        const errorMsg = (e as any).message || String(e)
        if (errorMsg.includes('timeout') || errorMsg.includes('ERR_CONNECTION')) {
            console.warn('⚠️  Indexer is slow or unavailable. Showing cached transactions instead.')
            console.warn('   Indexer: testnet-idx.algonode.cloud may be under load')
        } else {
            console.error('❌ Error fetching transaction history:', errorMsg)
        }
        // Return empty array - UI will show "No transactions yet"
        // This is graceful degradation - app still works without history
        return []
    }
}
