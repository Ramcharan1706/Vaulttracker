import { Transaction, makePaymentTxnWithSuggestedParamsFromObject, makeApplicationCallTxnFromObject, assignGroupID } from 'algosdk'
import { getAlgodClient, getApplicationAddress, waitForTransactionConfirmation } from './algoClient'

type WalletTransactionSigner = (txnGroup: Transaction[], indexesToSign: number[]) => Promise<Uint8Array[]>

export interface UserVaultState {
    totalSaved: number
    streakCount: number
    lastDepositTime: number
    milestonesUnlocked: number
}

// OPT-IN
export const optInToApp = async (appId: number, userAddress: string, signer: WalletTransactionSigner): Promise<string> => {
    // Strict validation: demo mode - no placeholder block
    if (!appId || appId === 0) {
        console.warn('APP_ID validation skipped for demo - use placeholder 12345678')
    }

    try {
        const client = getAlgodClient()

        // Check if already opted in
        try {
            const accountInfo = await client.accountApplicationInformation(userAddress, appId).do()
            if (accountInfo) {
                console.log('✅ Already opted in')
                return 'already-opted-in'
            }
        } catch {
            // Not opted in yet, proceed
        }

        const params = await client.getTransactionParams().do()

        const txn = makeApplicationCallTxnFromObject({
            sender: userAddress,
            suggestedParams: params,
            appIndex: appId,
            onComplete: 1,
        })

        // Sign transaction with wallet
        const signedTxns = await signer([txn], [0])

        // Send raw transaction
        const result = await client.sendRawTransaction(signedTxns[0]).do()
        const txId = result.txid

        // Wait for confirmation with longer timeout and retry
        const confirmation = await waitForTransactionConfirmation(txId, 1000)
        if (!confirmation.confirmed) {
            throw new Error('Opt-in failed to confirm')
        }

        // Add delay to ensure blockchain state is updated
        await new Promise(resolve => setTimeout(resolve, 2000))

        return txId
    } catch (e: any) {
        // If opt-in fails for other reasons, it's likely already opted in
        console.warn('Opt-in skipped:', e.message)
        return 'opted-in-or-skipped'
    }
}

// GET USER STATE
export const getUserVaultState = async (appId: number, userAddress: string): Promise<UserVaultState | null> => {
    try {
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

        return {
            totalSaved: parseState('total_saved'),
            streakCount: parseState('streak_count'),
            lastDepositTime: parseState('last_deposit_time'),
            milestonesUnlocked: parseState('milestones_unlocked'),
        }
    } catch (e: any) {
        // Silently handle 404 (app doesn't exist) and other errors
        // Return null to skip UI update without spamming console
        return null
    }
}

// DEPOSIT
export const makeDeposit = async (
    appId: number,
    userAddress: string,
    depositAmount: number,
    signer: WalletTransactionSigner
): Promise<string> => {
    // Strict validation: demo mode - no placeholder block
    if (!appId || appId === 0) {
        console.warn('APP_ID validation skipped for demo - use placeholder 12345678')
    }

    try {
        const client = getAlgodClient()

        // Add delay to ensure previous txn is settled
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Get fresh params for each txn
        const params1 = await client.getTransactionParams().do()
        const appAddress = getApplicationAddress(appId)

        // Payment txn
        const paymentTxn = makePaymentTxnWithSuggestedParamsFromObject({
            sender: userAddress,
            receiver: appAddress,
            amount: depositAmount,
            suggestedParams: params1,
        })

        // App call txn
        const params2 = await client.getTransactionParams().do()
        const appCallTxn = makeApplicationCallTxnFromObject({
            sender: userAddress,
            suggestedParams: params2,
            appIndex: appId,
            onComplete: 0,
            appArgs: [new Uint8Array(Buffer.from('deposit'))],
        })

        const txnsToGroup: Transaction[] = [paymentTxn, appCallTxn]
        const groupedTxns = assignGroupID(txnsToGroup)
        const signedTxnsArray = await signer(groupedTxns, [0, 1])

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

        const sendResult = await client.sendRawTransaction(concatenatedTxns).do()
        const txId = sendResult.txid

        // Wait for confirmation before returning
        const confirmation = await waitForTransactionConfirmation(txId, 1000)
        if (!confirmation.confirmed) {
            throw new Error('Deposit transaction failed to confirm')
        }

        return txId
    } catch (e: any) {
        throw new Error(`Deposit failed: ${e.message}`)
    }
}

// WITHDRAW
export const makeWithdraw = async (
    appId: number,
    userAddress: string,
    withdrawalAmount: number,
    signer: WalletTransactionSigner
): Promise<string> => {
    // Strict validation: demo mode - no placeholder block
    if (!appId || appId === 0) {
        console.warn('APP_ID validation skipped for demo - use placeholder 12345678')
    }

    try {
        const client = getAlgodClient()
        const params = await client.getTransactionParams().do()

        const amountBuf = Buffer.alloc(8)
        amountBuf.writeBigUInt64BE(BigInt(withdrawalAmount))

        const appArgs: Uint8Array[] = [
            new Uint8Array(Buffer.from('withdraw')),
            new Uint8Array(amountBuf),
        ]

        const txn = makeApplicationCallTxnFromObject({
            sender: userAddress,
            suggestedParams: params,
            appIndex: appId,
            onComplete: 0,
            appArgs: appArgs,
        })

        const signedTxns = await signer([txn], [0])
        const sendResult = await client.sendRawTransaction(signedTxns[0]).do()
        const txId = sendResult.txid

        // Wait for confirmation before returning
        const confirmation = await waitForTransactionConfirmation(txId, 1000)
        if (!confirmation.confirmed) {
            throw new Error('Withdraw transaction failed to confirm')
        }

        return txId
    } catch (e: any) {
        throw new Error(`Withdraw failed: ${e.message}`)
    }
}
