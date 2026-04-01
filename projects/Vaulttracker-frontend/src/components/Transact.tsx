import { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { makeDeposit, optInToApp, makeWithdraw } from '../services/vaultService'

interface TransactInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const APP_ID = parseInt(import.meta.env.VITE_APP_ID || '0')

const Transact = ({ openModal, setModalState }: TransactInterface) => {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('1')
  const { enqueueSnackbar } = useSnackbar()
  const { transactionSigner, activeAddress } = useWallet()

  const handleDeposit = async () => {
    if (!transactionSigner || !activeAddress || !amount) {
      enqueueSnackbar('Connect wallet', { variant: 'error' })
      return
    }

    if (APP_ID === 0) {
      enqueueSnackbar('App not configured', { variant: 'error' })
      return
    }

    const amountAlgo = parseFloat(amount)
    if (isNaN(amountAlgo) || amountAlgo <= 0) {
      enqueueSnackbar('Invalid amount', { variant: 'error' })
      return
    }

    setLoading(true)
    const amountInMicroAlgos = Math.floor(amountAlgo * 1_000_000)

    try {
      // Try opt-in
      try {
        await optInToApp(APP_ID, activeAddress, transactionSigner as any)
      } catch {
        // Already opted in
      }

      // Make deposit
      const txId = await makeDeposit(APP_ID, activeAddress, amountInMicroAlgos, transactionSigner as any)
      enqueueSnackbar(`Deposited ${amountAlgo} ALGO! TX: ${txId.slice(0, 8)}...`, { variant: 'success' })
      setAmount('1')
      setModalState(false)
    } catch (e) {
      const message = (e as any).message || 'Deposit failed'
      enqueueSnackbar(message, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog className={`modal ${openModal ? 'modal-open' : ''}`} style={{ display: openModal ? 'block' : 'none' }}>
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-lg">Deposit to Vault</h3>

        <div className="form-control my-4">
          <label className="label">
            <span className="label-text">Amount (ALGO)</span>
          </label>
          <input
            type="number"
            placeholder="0.00"
            className="input input-bordered"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
            min="0"
            step="0.1"
          />
        </div>

        <div className="modal-action">
          <button
            type="button"
            onClick={() => setModalState(false)}
            className="btn"
            disabled={loading}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDeposit}
            className="btn btn-primary"
            disabled={loading || !amount}
          >
            {loading ? 'Loading...' : 'Deposit'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default Transact
