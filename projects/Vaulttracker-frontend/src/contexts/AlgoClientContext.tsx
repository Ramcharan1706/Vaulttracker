import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Algodv2, Indexer } from 'algosdk';
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs';
import { initializeAlgoClients, getAlgodClient, getIndexerClient } from '../services/algoClient';
import type { AlgoViteClientConfig } from '../interfaces/network';


interface AlgoClients {
  algod: Algodv2 | null;
  indexer: Indexer | null;
  isReady: boolean;
  error: string | null;
  config: {
    algod: AlgoViteClientConfig;
    indexer: AlgoViteClientConfig;
  };
}

const AlgoClientContext = createContext<AlgoClients | null>(null);

export const useAlgoClients = () => {
  const context = useContext(AlgoClientContext);
  if (!context) {
    throw new Error('useAlgoClients must be used within AlgoClientProvider');
  }
  return context;
};

interface AlgoClientProviderProps {
  children: ReactNode;
}

export const AlgoClientProvider: React.FC<AlgoClientProviderProps> = ({ children }) => {
  const [clients, setClients] = useState<AlgoClients>({
    algod: null,
    indexer: null,
    isReady: false,
    error: null,
    config: { algod: { server: '', port: '', token: '', network: '' }, indexer: { server: '', port: '', token: '', network: '' } },
  });

    useEffect(() => {
      let isMounted = true;

      const initClients = async () => {
        try {
          const algodConfig = getAlgodConfigFromViteEnvironment();
          const indexerConfig = getIndexerConfigFromViteEnvironment();

          // Initialize global singleton clients for services
          initializeAlgoClients({
            algodServer: algodConfig.server,
            algodPort: String(algodConfig.port),
            algodToken: String(algodConfig.token),
            indexerServer: indexerConfig.server,
            indexerPort: String(indexerConfig.port),
            indexerToken: String(indexerConfig.token),
          });

          // Get clients (don't require health check to pass)
          const algod = getAlgodClient();
          const indexer = getIndexerClient();

          if (isMounted) {
            setClients({
              algod,
              indexer,
              isReady: true,
              error: null,
              config: { algod: algodConfig, indexer: indexerConfig },
            });
          }

        } catch (error) {
          console.error('Algo clients init failed:', error);
          if (isMounted) {
            setClients(prev => ({ ...prev, isReady: false, error: (error as Error).message }));
          }
        }
      };

      initClients();

      return () => {
        isMounted = false;
      };
    }, []);


  return (
    <AlgoClientContext.Provider value={clients}>
      {children}
    </AlgoClientContext.Provider>
  );
};

