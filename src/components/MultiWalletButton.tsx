import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { WalletModal } from './WalletModal';

export function MultiWalletButton() {
  const { publicKey, disconnect, connecting, connected } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  const shortenAddress = (address: string, chars = 4): string => {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  const handleConnect = () => {
    setModalOpen(true);
  };

  const handleSwitchWallet = () => {
    setModalOpen(true);
  };

  if (connected && publicKey) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={connecting}
              className="glass border-primary/30 text-primary hover:bg-primary/10 font-mono"
            >
              <Wallet className="h-4 w-4" />
              {shortenAddress(publicKey.toBase58())}
              <ChevronDown className="h-4 w-4 opacity-80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleSwitchWallet}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Switch Wallet
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
        <WalletModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleConnect}
        disabled={connecting}
        className="bg-primary text-primary-foreground hover:bg-primary/90 glow w-full md:w-auto"
      >
        {connecting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="mr-2 h-4 w-4" />
        )}
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      <WalletModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
