import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import Home from './Home'
import { AlgoClientProvider } from './contexts/AlgoClientContext'
import { getAlgodConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
import './styles/globals.css'

const supportedWallets: SupportedWallet[] = [
  { id: WalletId.PERA },
  { id: WalletId.DEFLY },
  { id: WalletId.EXODUS },
]

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <AlgoClientProvider>
        <WalletProvider manager={walletManager}>
          <Home />
        </WalletProvider>
      </AlgoClientProvider>
    </SnackbarProvider>
  )
}

