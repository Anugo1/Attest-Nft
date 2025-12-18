import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/useWallet';
import { shortenAddress } from '@/lib/solana';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, Loader2, ChevronDown, RefreshCw } from 'lucide-react';

export function WalletButton() {
  const { connected, publicKey, connecting, connect, disconnect, isPhantomInstalled } = useWallet();
  const [reconnecting, setReconnecting] = useState(false);

  const handleSwitchWallet = async () => {
    // Phantom doesn’t let a dApp directly pick an account.
    // Best UX we can provide: disconnect then reconnect (Phantom will prompt, and the user can pick/switch).
    try {
      setReconnecting(true);
      await disconnect();
      await connect();
    } finally {
      setReconnecting(false);
    }
  };

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={connecting || reconnecting}
              className="glass border-primary/30 text-primary hover:bg-primary/10 font-mono"
            >
              {reconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              {shortenAddress(publicKey)}
              <ChevronDown className="h-4 w-4 opacity-80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleSwitchWallet} disabled={reconnecting}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Connect different wallet
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={disconnect}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
