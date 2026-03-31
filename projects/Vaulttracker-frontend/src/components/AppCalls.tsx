import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { MdInfo } from 'react-icons/md'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

interface AppCallsInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const AppCalls = ({ openModal, setModalState }: AppCallsInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [contractInput, setContractInput] = useState<string>('')
  const { enqueueSnackbar } = useSnackbar()
  const { transactionSigner, activeAddress } = useWallet()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const indexerConfig = getIndexerConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({
    algodConfig,
    indexerConfig,
  })

  const sendAppCall = async () => {
    if (!activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      return
    }

    setLoading(true)

    try {
      enqueueSnackbar(
        '💡 Use the Deposit Flow component for vault operations. AppCalls is a test module.',
        { variant: 'info', autoHideDuration: 5000 }
      )
    } catch (e: any) {
      console.error('AppCall error:', e)
      enqueueSnackbar(`❌ Error: ${e.message || 'Unknown error'}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog
      id="appcalls_modal"
      className={`modal ${openModal ? 'modal-open' : ''}`}
      style={{ display: openModal ? 'block' : 'none' }}
    >
      <form method="dialog" className="modal-box w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <MdInfo className="text-info" size={20} aria-hidden="true" />
            Smart Contract Testing
          </h3>
          <button
            type="button"
            onClick={() => setModalState(false)}
            className="btn btn-sm btn-circle btn-ghost"
          >
            ✕
          </button>
        </div>

        <div className="alert alert-info mb-4">
          <span className="text-sm">
            ℹ️ This module is for testing contract interactions. For vault operations, use the Deposit Flow component.
          </span>
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Contract Input</span>
          </label>
          <input
            type="text"
            placeholder="Enter test input"
            className="input input-bordered w-full"
            value={contractInput}
            onChange={(e) => setContractInput(e.target.value)}
            disabled={loading}
            aria-label="Contract input"
          />
        </div>

        <div className="modal-action gap-2">
          <button
            type="button"
            className="btn btn-ghost flex-1"
            onClick={() => {
              setModalState(false)
              setContractInput('')
            }}
            disabled={loading}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={sendAppCall}
            disabled={loading || !activeAddress}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Processing...
              </>
            ) : (
              'Send Call'
            )}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default AppCalls
