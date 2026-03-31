import { useWallet } from '@txnlab/use-wallet-react'
import { useMemo } from 'react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { MdLanguage, MdContentCopy } from 'react-icons/md'

const Account = () => {
  const { activeAddress } = useWallet()
  const algoConfig = getAlgodConfigFromViteEnvironment()

  const networkName = useMemo(() => {
    return algoConfig.network === '' ? 'localnet' : algoConfig.network.toLocaleLowerCase()
  }, [algoConfig.network])

  const explorerUrl = `https://lora.algokit.io/${networkName}/account/${activeAddress}/`

  const handleCopyAddress = () => {
    if (activeAddress) {
      navigator.clipboard.writeText(activeAddress)
    }
  }

  return (
    <div className="card bg-slate-800 border border-slate-700">
      <div className="card-body">
        <h3 className="card-title text-lg mb-4 flex items-center gap-2">
          <MdLanguage className="text-primary-400" size={20} aria-hidden="true" />
          Account Details
        </h3>

        <div className="space-y-4">
          {/* Network */}
          <div>
            <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Network</p>
            <p className="text-lg font-semibold text-slate-100 capitalize">
              {networkName}
            </p>
          </div>

          {/* Address */}
          {activeAddress && (
            <div>
              <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Wallet Address</p>
              <div className="flex items-center gap-2">
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-monospace text-primary-400 hover:text-primary-300 transition-colors"
                  title={activeAddress}
                  aria-label="View account on explorer"
                >
                  {ellipseAddress(activeAddress)}
                </a>
                <button
                  onClick={handleCopyAddress}
                  className="btn btn-ghost btn-sm btn-square"
                  title="Copy address"
                  aria-label="Copy address to clipboard"
                >
                  <MdContentCopy size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* Explorer Link */}
          <div className="pt-2">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm w-full"
              aria-label="View account on AlgoKit explorer"
            >
              📊 View on Explorer
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Account
