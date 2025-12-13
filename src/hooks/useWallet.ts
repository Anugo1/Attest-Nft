import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getProvider, isPhantomInstalled, PhantomProvider } from '@/lib/solana';

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
  provider: PhantomProvider | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    connecting: false,
    provider: null,
  });

  useEffect(() => {
    const provider = getProvider();
    if (provider) {
      setState(prev => ({ ...prev, provider }));
      
      // Check if already connected
      if (provider.publicKey) {
        setState(prev => ({
          ...prev,
          connected: true,
          publicKey: provider.publicKey?.toBase58() || null,
        }));
      }

      // Listen for connection changes
      const handleConnect = (publicKey: PublicKey) => {
        setState(prev => ({
          ...prev,
          connected: true,
          publicKey: publicKey.toBase58(),
          connecting: false,
        }));
      };

      const handleDisconnect = () => {
        setState(prev => ({
          ...prev,
          connected: false,
          publicKey: null,
        }));
      };

      provider.on('connect', handleConnect);
      provider.on('disconnect', handleDisconnect);

      return () => {
        provider.off('connect', handleConnect);
        provider.off('disconnect', handleDisconnect);
      };
    }
  }, []);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      window.open('https://phantom.app/', '_blank');
      return;
    }

    try {
      setState(prev => ({ ...prev, connecting: true }));
      const response = await provider.connect();
      setState(prev => ({
        ...prev,
        connected: true,
        publicKey: response.publicKey.toBase58(),
        connecting: false,
      }));
    } catch (error) {
      console.error('Failed to connect:', error);
      setState(prev => ({ ...prev, connecting: false }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    const provider = getProvider();
    if (provider) {
      try {
        await provider.disconnect();
        setState(prev => ({
          ...prev,
          connected: false,
          publicKey: null,
        }));
      } catch (error) {
        console.error('Failed to disconnect:', error);
      }
    }
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    const provider = getProvider();
    if (!provider || !provider.publicKey) return null;

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const { signature } = await provider.signMessage(encodedMessage);
      return Buffer.from(signature).toString('base64');
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }, []);

  return {
    ...state,
    isPhantomInstalled: isPhantomInstalled(),
    connect,
    disconnect,
    signMessage,
  };
}
