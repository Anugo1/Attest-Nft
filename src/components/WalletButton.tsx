import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/useWallet';
import { shortenAddress } from '@/lib/solana';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export function WalletButton() {
  const { connected, publicKey, connecting, connect, disconnect, isPhantomInstalled } = useWallet();

  // Show loading state while checking for Phantom
  if (isPhantomInstalled === null) {
    return (
      <Button disabled className="bg-primary/50 text-primary-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (!isPhantomInstalled) {
    return (
      <Button
        onClick={() => window.open('https://phantom.app/', '_blank')}
        className="bg-primary text-primary-foreground hover:bg-primary/90 glow"
      >
        <Wallet className="mr-2 h-4 w-4" />
        Install Phantom
      </Button>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="glass px-4 py-2 font-mono text-sm text-primary">
          {shortenAddress(publicKey)}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={disconnect}
          className="border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={connect}
      disabled={connecting}
      className="bg-primary text-primary-foreground hover:bg-primary/90 glow"
    >
      {connecting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Wallet className="mr-2 h-4 w-4" />
      )}
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
