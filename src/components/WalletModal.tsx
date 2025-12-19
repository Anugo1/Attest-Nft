import { useWallet } from '@solana/wallet-adapter-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletModal({ open, onOpenChange }: WalletModalProps) {
  const { wallets, select } = useWallet();

  const handleWalletSelect = (wallet: typeof wallets[number]) => {
    select(wallet.adapter.name);
    onOpenChange(false);
  };

  // Filter to only Solana wallets and remove duplicates
  const solanaWallets = wallets.filter((wallet) => {
    const name = wallet.adapter.name.toLowerCase();
    // Exclude Ethereum wallets like MetaMask
    return !name.includes('metamask') && !name.includes('coinbase') && wallet.readyState !== 'Unsupported';
  });

  // Remove duplicates by name
  const uniqueWallets = solanaWallets.filter((wallet, index, self) =>
    index === self.findIndex((w) => w.adapter.name === wallet.adapter.name)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Choose a Solana wallet to connect to the application
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {uniqueWallets.length > 0 ? (
            uniqueWallets.map((wallet, index) => (
              <Button
                key={`${wallet.adapter.name}-${index}`}
                onClick={() => handleWalletSelect(wallet)}
                variant="outline"
                className="w-full justify-start gap-3 h-14 text-base hover:bg-primary/10 hover:border-primary/50"
              >
                {wallet.adapter.icon && (
                  <img
                    src={wallet.adapter.icon}
                    alt={wallet.adapter.name}
                    className="h-8 w-8"
                  />
                )}
                <span>{wallet.adapter.name}</span>
              </Button>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No Solana wallets detected. Please install a Solana wallet extension.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
