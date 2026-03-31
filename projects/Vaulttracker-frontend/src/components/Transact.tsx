import { algo, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { makeDeposit, optInToVault } from '../services/vaultService'
import { recordTransaction, updateTransactionStatus } from '../services/transactionHistory'

interface TransactInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const APP_ID = parseInt(import.meta.env.VITE_APP_ID || '0')
const RECEIVER_ADDRESS = '2ZTFJNDXPWDETGJQQN33HAATRHXZMBWESKO2AUFZUHERH2H3TG4XTNPL4Y'

const Transact = ({ openModal, setModalState }: TransactInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [txType, setTxType] = useState<'payment' | 'deposit'>('deposit')
  const [amount, setAmount] = useState<string>('1')
  const [receiverAddress, setReceiverAddress] = useState<string>(RECEIVER_ADDRESS)
  const [isOptedIn, setIsOptedIn] = useState<boolean>(false)
  const [lastError, setLastError] = useState<string>('')

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({ algodConfig })

  const { enqueueSnackbar } = useSnackbar()
  const { transactionSigner, activeAddress } = useWallet()

  // Handle payment transaction
  const handleSubmitPayment = async () => {
    setLoading(true)

    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setLoading(false)
      return
    }

    if (!receiverAddress || receiverAddress.length !== 58) {
      enqueueSnackbar('Invalid receiver address', { variant: 'error' })
      setLoading(false)
      return
    }

    const amountAlgo = parseFloat(amount)
    if (isNaN(amountAlgo) || amountAlgo <= 0) {
      enqueueSnackbar('Invalid amount', { variant: 'error' })
      setLoading(false)
      return
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    try {
      enqueueSnackbar('Sending payment...', { variant: 'info' })

      // Record pending transaction
      recordTransaction(activeAddress, {
        id: txId,
        txId: 'pending',
        type: 'payment',
        amount: Math.floor(amountAlgo * 1_000_000),
        amountAlgo,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'pending',
        receiver: receiverAddress,
      })

      const result = await algorand.send.payment({
        signer: transactionSigner,
        sender: activeAddress,
        receiver: receiverAddress,
        amount: algo(amountAlgo),
      })

      const actualTxId = result.txIds[0]

      // Update transaction with confirmed status
      updateTransactionStatus(activeAddress, txId, 'confirmed')
      recordTransaction(activeAddress, {
        id: txId,
        txId: actualTxId,
        type: 'payment',
        amount: Math.floor(amountAlgo * 1_000_000),
        amountAlgo,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'confirmed',
        receiver: receiverAddress,
      })

      enqueueSnackbar(`Payment sent! TX: ${actualTxId}`, { variant: 'success' })
      setAmount('1')
      setModalState(false)
    } catch (e) {
      const errorMsg = (e as any).message || 'Failed to send payment'
      enqueueSnackbar(errorMsg, { variant: 'error' })
      console.error('Payment error:', e)

      // Record failed transaction
      updateTransactionStatus(activeAddress, txId, 'failed', errorMsg)
    }

    setLoading(false)
  }

  // Handle opt-in to vault
  const handleOptInToVault = async () => {
    setLoading(true)
    setLastError('')

    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setLoading(false)
      return
    }

    if (APP_ID === 0) {
      enqueueSnackbar('❌ App not configured. Set VITE_APP_ID in .env and restart dev server', { variant: 'error' })
      setLoading(false)
      return
    }

    try {
      enqueueSnackbar('🔐 Approving opt-in in Pera Wallet...', { variant: 'info' })
      console.log('🔐 Starting opt-in process for app', APP_ID)
      console.log('  User:', activeAddress)

      const txId = await optInToVault(APP_ID, activeAddress, transactionSigner as any)

      console.log('✅ Opt-in completed:', txId)
      enqueueSnackbar('✅ Successfully opted in! Now try depositing again.', { variant: 'success' })
      setIsOptedIn(true)
      setLastError('')
    } catch (e) {
      const errorMsg = (e as any).message || 'Failed to opt in'
      console.error('❌ Opt-in error:', errorMsg, e)
      enqueueSnackbar(`Opt-in failed: ${errorMsg}`, { variant: 'error' })
      setLastError(errorMsg)
    }

    setLoading(false)
  }

  const handleSubmit = () => {
    if (txType === 'payment') {
      handleSubmitPayment()
    } else {
      handleSubmitDeposit()
    }
  }

  // Handle deposit to vault
  const handleSubmitDeposit = async () => {
    setLoading(true)

    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setLoading(false)
      return
    }

    if (APP_ID === 0) {
      enqueueSnackbar('❌ App not configured. Set VITE_APP_ID in .env and restart dev server', { variant: 'error' })
      setLoading(false)
      return
    }

    const amountAlgo = parseFloat(amount)
    if (isNaN(amountAlgo) || amountAlgo <= 0) {
      enqueueSnackbar('Enter a valid amount greater than 0', { variant: 'error' })
      setLoading(false)
      return
    }

    if (amountAlgo > 10000000) {
      enqueueSnackbar('Amount seems too high. Please verify.', { variant: 'warning' })
      setLoading(false)
      return
    }

    const amountInMicroAlgos = Math.floor(amountAlgo * 1_000_000)
    const lockDurationSeconds = 0 // No lock for basic deposit
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    try {
      enqueueSnackbar('Processing deposit...', { variant: 'info' })

      // Record pending transaction
      recordTransaction(activeAddress, {
        id: txId,
        txId: 'pending',
        type: 'deposit',
        amount: amountInMicroAlgos,
        amountAlgo,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'pending',
      })

      const result = await makeDeposit(
        APP_ID,
        activeAddress,
        amountInMicroAlgos,
        lockDurationSeconds,
        transactionSigner as any
      )

      // Update transaction with confirmed status
      updateTransactionStatus(activeAddress, txId, 'confirmed')
      recordTransaction(activeAddress, {
        id: txId,
        txId: result.groupTransactionId,
        type: 'deposit',
        amount: amountInMicroAlgos,
        amountAlgo,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'confirmed',
      })

      enqueueSnackbar(`Deposit submitted! TX: ${result.groupTransactionId.slice(0, 12)}...`, { variant: 'success' })
      setAmount('1')
      setModalState(false)
    } catch (e) {
      const errorMsg = (e as any).message || 'Failed to deposit'
      console.error('❌ Deposit error:', errorMsg, e)

      // Detect opt-in error and set flag - be explicit about all variations
      if (
        errorMsg.includes('Wallet not opted in') ||
        errorMsg.includes('opted in to this app') ||
        errorMsg.includes('not opted in')
      ) {
        console.log('🔐 Opt-in required - showing opt-in button')
        setIsOptedIn(false)
        setLastError('NOT_OPTED_IN')
        enqueueSnackbar('ℹ️ You must opt in first. Click the button below to approve.', { variant: 'warning' })
      } else {
        setLastError(errorMsg)
        enqueueSnackbar(`Deposit failed: ${errorMsg}`, { variant: 'error' })
      }

      // Record failed transaction
      updateTransactionStatus(activeAddress, txId, 'failed', errorMsg)
    }

    setLoading(false)
  }

  return (
    <dialog id="transact_modal" className={`modal ${openModal ? 'modal-open' : ''} bg-slate-200`} style={{ display: openModal ? 'block' : 'none' }}>
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-lg">{txType === 'deposit' ? 'Deposit to Vault' : 'Send Payment'}</h3>
        <br />

        {/* Transaction Type Selector */}
        <div className="tabs tabs-boxed mb-4 w-full">
          <button
            type="button"
            className={`tab flex-1 ${txType === 'deposit' ? 'tab-active' : ''}`}
            onClick={() => setTxType('deposit')}
            disabled={loading}
          >
            💰 Deposit
          </button>
          <button
            type="button"
            className={`tab flex-1 ${txType === 'payment' ? 'tab-active' : ''}`}
            onClick={() => setTxType('payment')}
            disabled={loading}
          >
            📤 Payment
          </button>
        </div>

        {/* Amount Input */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Amount (ALGO)</span>
          </label>
          <input
            type="number"
            data-test-id={txType === 'deposit' ? 'deposit-amount' : 'payment-amount'}
            placeholder="Enter amount in ALGO"
            className="input input-bordered w-full"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
            }}
            step="0.001"
            min="0"
            disabled={loading}
          />
          <label className="label">
            <span className="label-text-alt text-gray-500">
              {parseFloat(amount) > 0 && `≈ ${(parseFloat(amount) * 1_000_000).toLocaleString()} µA`}
            </span>
          </label>
        </div>

        {/* Receiver Address - Only for Payment */}
        {txType === 'payment' && (
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Receiver Address</span>
            </label>
            <input
              type="text"
              data-test-id="receiver-address"
              placeholder="Provide wallet address (58 chars)"
              className="input input-bordered w-full"
              value={receiverAddress}
              onChange={(e) => {
                setReceiverAddress(e.target.value)
              }}
              disabled={loading}
            />
            <label className="label">
              <span className="label-text-alt text-gray-500">
                {receiverAddress.length}/58 characters
              </span>
            </label>
          </div>
        )}

        {/* Info Message for Deposit */}
        {txType === 'deposit' && (
          <div className="alert alert-info mb-4">
            <span className="text-sm">📌 Deposit will be locked in the vault. Approve in Pera Wallet.</span>
          </div>
        )}

        {/* Opt-In Required Warning */}
        {lastError === 'NOT_OPTED_IN' && txType === 'deposit' && (
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4v2m0 4v2m0-16v2m0-4v2" /></svg>
            <div>
              <h3 className="font-bold text-sm">🔐 Opt-In Required</h3>
              <div className="text-xs mt-1">Your wallet must be opted into this app before you can deposit. Click the button below to approve the one-time opt-in transaction.</div>
            </div>
          </div>
        )}

        <div className="modal-action grid">
          <button className="btn" onClick={() => setModalState(false)} disabled={loading}>
            Close
          </button>

          {/* Show Opt-In Button if not opted in */}
          {lastError === 'NOT_OPTED_IN' && txType === 'deposit' ? (
            <button
              data-test-id="opt-in-button"
              className="btn btn-error flex-1 gap-2"
              onClick={handleOptInToVault}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Approving in Pera Wallet...
                </>
              ) : (
                <>
                  🔐 Opt-In to Vault (One-Time)
                </>
              )}
            </button>
          ) : (
            <button
              data-test-id={txType === 'deposit' ? 'deposit-button' : 'send-algo'}
              className={`btn ${parseFloat(amount) > 0 && (txType === 'deposit' || receiverAddress.length === 58) ? 'btn-primary' : 'btn-disabled'}`}
              onClick={handleSubmit}
              disabled={loading || parseFloat(amount) <= 0 || (txType === 'payment' && receiverAddress.length !== 58)}
            >
              {loading ? (
                <span className="loading loading-spinner" />
              ) : txType === 'deposit' ? (
                `Deposit ${amount} ALGO`
              ) : (
                `Send ${amount} ALGO`
              )}
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}

export default Transact
