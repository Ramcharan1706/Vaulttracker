import { useWallet } from '@txnlab/use-wallet-react'
import { useAppStore } from '../store'
import { MdWallet, MdLogout } from 'react-icons/md'
import { useSnackbar } from 'notistack'

export const WalletConnector = () => {
  const { activeAddress, wallets } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const reset = useAppStore((s) => s.reset)

  const handleConnect = async () => {
    if (wallets && wallets.length > 0) {
      // For testnet/mainnet, use Pera wallet
      const peraWallet = wallets.find((w) => w.id === 'pera')
      if (peraWallet) {
        try {
          await peraWallet.connect()
          enqueueSnackbar('✅ Wallet connected successfully!', { variant: 'success' })
        } catch (e) {
          console.error('❌ Failed to connect wallet:', e)
          enqueueSnackbar('Failed to connect wallet. Please try again.', { variant: 'error' })
        }
      } else {
        enqueueSnackbar('❌ Pera wallet not available', { variant: 'error' })
      }
    }
  }

  const handleDisconnect = async () => {
    try {
      // Disconnect wallet by finding it and calling disconnect
      if (wallets && wallets.length > 0) {
        const peraWallet = wallets.find((w) => w.id === 'pera')
        if (peraWallet && (peraWallet as any).disconnect) {
          await (peraWallet as any).disconnect()
        }
      }
      // Reset app state
      reset()
      enqueueSnackbar('✅ Wallet disconnected', { variant: 'info' })
    } catch (e) {
      console.error('❌ Failed to disconnect wallet:', e)
      enqueueSnackbar('Failed to disconnect wallet', { variant: 'error' })
    }
  }

  const shortenAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="flex items-center gap-2" role="navigation" aria-label="Wallet connection">
      {activeAddress ? (
        <>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 hover:border-slate-500 transition-colors"
            role="status"
            aria-label={`Wallet connected: ${shortenAddress(activeAddress)}`}
          >
            <MdWallet className="text-success-400 animate-pulse" size={18} aria-hidden="true" />
            <span className="text-sm font-medium text-slate-100" title={activeAddress}>
              {shortenAddress(activeAddress)}
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="btn btn-secondary flex items-center gap-2 px-3 py-2 hover:btn-error transition-colors"
            title="Disconnect wallet"
            aria-label="Disconnect wallet"
          >
            <MdLogout size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </>
      ) : (
        <button
          onClick={handleConnect}
          className="btn btn-primary flex items-center gap-2"
          aria-label="Connect Pera wallet"
        >
          <MdWallet size={18} aria-hidden="true" />
          Connect Wallet
        </button>
      )}
    </div>
  )
}
