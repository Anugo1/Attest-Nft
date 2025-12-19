import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useCallback } from 'react';

export function useMultiWallet() {
  const { publicKey, connected, connecting, disconnect, signMessage } = useSolanaWallet();

  const signMessageWrapper = useCallback(async (message: string): Promise<string | null> => {
    if (!signMessage || !publicKey) return null;

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      
      let binary = '';
      for (let i = 0; i < signature.length; i++) {
        binary += String.fromCharCode(signature[i]);
      }
      return btoa(binary);
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }, [signMessage, publicKey]);

  return {
    connected,
    publicKey: publicKey?.toBase58() || null,
    connecting,
    disconnect,
    signMessage: signMessageWrapper,
  };
}
