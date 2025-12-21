import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlowCard } from './GlowCard';
import { useMultiWallet } from '@/hooks/useMultiWallet';
import { toast } from 'sonner';
import { Loader2, Gift, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api-adapter';

interface ClaimNFTProps {
  eventId: string;
  eventName: string;
  claimCode: string;
  onSuccess?: () => void;
}

export function ClaimNFT({ eventId, eventName, claimCode, onSuccess }: ClaimNFTProps) {
  const { connected, publicKey, signMessage } = useMultiWallet();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      // Sign a message to verify wallet ownership
      const message = `Claim Attendance NFT for event: ${eventName}\nCode: ${claimCode}\nTimestamp: ${Date.now()}`;
      const signature = await signMessage(message);

      if (!signature) {
        throw new Error('Failed to sign message');
      }

      // Check existing claim state
      const { data: existingClaim } = await api.checkExistingClaim(eventId, publicKey);

      // Only block if mint is already completed
      if (existingClaim?.status === 'completed' && existingClaim?.mint_address) {
        setClaimed(true);
        toast.success('Attendance NFT already claimed.');
        onSuccess?.();
        return;
      }

      const claimIdToUse = existingClaim?.id
        ? existingClaim.id
        : (await api.createClaim({
            event_id: eventId,
            wallet_address: publicKey,
            signature,
            status: 'pending',
          })).data.id;

      // Call backend to mint NFT
      const { data: mintResult } = await api.mintNFT(claimIdToUse, eventId, publicKey, signature);

      if (!mintResult?.success) {
        throw new Error('Mint failed');
      }

      setClaimed(true);
      toast.success('Attendance NFT claimed successfully!');
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Failed to claim NFT:', error);
      const message = error instanceof Error ? error.message : 'Failed to claim NFT';
      setError(message);
      toast.error(message);
    } finally {
      setClaiming(false);
    }
  };

  if (claimed) {
    return (
      <GlowCard glowColor="cyan" className="text-center py-8">
        <CheckCircle2 className="h-12 sm:h-16 w-12 sm:w-16 mx-auto text-neon-green mb-4" />
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">NFT Claimed!</h3>
        <p className="text-sm sm:text-base text-muted-foreground px-2">
          Your Attest NFT has been minted and sent to your wallet.
        </p>
      </GlowCard>
    );
  }

  if (error) {
    return (
      <GlowCard glowColor="pink" className="text-center py-8">
        <XCircle className="h-12 sm:h-16 w-12 sm:w-16 mx-auto text-destructive mb-4" />
        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">Claim Failed</h3>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 px-2">{error}</p>
        <Button
          onClick={() => setError(null)}
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10 w-full sm:w-auto"
        >
          Try Again
        </Button>
      </GlowCard>
    );
  }

  return (
    <GlowCard className="text-center py-8">
      <Gift className="h-12 sm:h-16 w-12 sm:w-16 mx-auto text-primary mb-4 animate-float" />
      <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Claim Your NFT</h3>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 px-2">
        {connected
          ? 'Click below to claim your Attendance NFT'
          : 'Connect your wallet to claim your Attendance NFT'}
      </p>

      <Button
        onClick={handleClaim}
        disabled={!connected || claiming}
        className="bg-primary text-primary-foreground hover:bg-primary/90 glow px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg w-full sm:w-auto"
      >
        {claiming ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Minting NFT...
          </>
        ) : (
          <>
            <Gift className="mr-2 h-5 w-5" />
            Claim Attendance NFT
          </>
        )}
      </Button>
    </GlowCard>
  );
}
