import { Algodv2, Indexer, Transaction } from 'algosdk'
import * as algosdk from 'algosdk'

export interface AlgoClientConfig {
    algodServer: string
    algodPort: string | number
    algodToken: string
    indexerServer: string
    indexerPort: string | number
    indexerToken: string
}

let algodClient: Algodv2 | null = null
let indexerClient: Indexer | null = null

export const initializeAlgoClients = (config: AlgoClientConfig) => {
    // Direct connection to Algorand node (no proxy)
    const port = parseInt(config.algodPort.toString())
    algodClient = new Algodv2(config.algodToken, config.algodServer, port)
    indexerClient = new Indexer(config.indexerToken, config.indexerServer, parseInt(config.indexerPort.toString()))
}

export const getAlgodClient = (): Algodv2 => {
    if (!algodClient) {
        throw new Error('Algod client not initialized. Call initializeAlgoClients first.')
    }
    return algodClient
}

export const getIndexerClient = (): Indexer => {
    if (!indexerClient) {
        throw new Error('Indexer client not initialized. Call initializeAlgoClients first.')
    }
    return indexerClient
}

/**
 * Compute the application's escrow address (app state address)
 * Uses algosdk's built-in method to properly encode the application address
 */
export const getApplicationAddress = (appId: number): string => {
    if (appId === 0) {
        throw new Error('Cannot compute address for app ID 0 - app not deployed')
    }
    return algosdk.getApplicationAddress(appId).toString()
}

export const waitForTransactionConfirmation = async (txId: string, maxRounds: number = 1000) => {
    const client = getAlgodClient()
    let confirmed = false
    let round = 1

    while (!confirmed && round < maxRounds) {
        try {
            const tx = await client.pendingTransactionInformation(txId).do()
            if (tx.confirmedRound) {
                return {
                    confirmed: true,
                    round: tx.confirmedRound,
                    txInfo: tx,
                }
            }
        } catch (e) {
            // Transaction not yet in pending pool
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))
        round++
    }

    return {
        confirmed: false,
        round: 0,
        error: 'Transaction confirmation timeout',
    }
}

export const getTransactionDetails = async (txId: string) => {
    const client = getIndexerClient()
    try {
        const response = await client.searchForTransactions().txid(txId).do()
        return response.transactions?.[0] || null
    } catch (e) {
        console.error('Error fetching transaction details:', e)
        return null
    }
}

export const submitGroupedTransactions = async (
    atc: AtomicTransactionComposer,
    signer: any
) => {
    try {
        const txGroup = atc.buildGroup()
        const signedTxns = await atc.gatherSignatures()

        const client = getAlgodClient()
        const txId = await client.sendRawTransaction(signedTxns).do()

        return {
            success: true,
            txId: txId.txid,
            txIds: txGroup.map((_, i) => txId.txid),  // First txId is group txId
        }
    } catch (e) {
        console.error('Error submitting grouped transactions:', e)
        throw e
    }
}
