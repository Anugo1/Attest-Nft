import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

// Solana Devnet connection
export const SOLANA_NETWORK = 'devnet';
export const SOLANA_ENDPOINT = clusterApiUrl(SOLANA_NETWORK);
export const connection = new Connection(SOLANA_ENDPOINT, 'confirmed');

// Phantom wallet types
export interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  isConnected: boolean;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (args: any) => void) => void;
  off: (event: string, callback: (args: any) => void) => void;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
    phantom?: {
      solana?: PhantomProvider;
    };
  }
}

export const getProvider = (): PhantomProvider | null => {
  if (typeof window === 'undefined') return null;
  
  if (window.phantom?.solana?.isPhantom) {
    return window.phantom.solana;
  }
  
  if (window.solana?.isPhantom) {
    return window.solana;
  }
  
  return null;
};

export const isPhantomInstalled = (): boolean => {
  return getProvider() !== null;
};

export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const formatSOL = (lamports: number): string => {
  return (lamports / 1_000_000_000).toFixed(4);
};
