import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlowCard } from './GlowCard';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';
import { Loader2, Gift, CheckCircle2, XCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ClaimNFTProps {
  eventId: string;
  eventName: string;
  claimCode: string;
  onSuccess?: () => void;
}

export function ClaimNFT({ eventId, eventName, claimCode, onSuccess }: ClaimNFTProps) {
  const { connected, publicKey, signMessage } = useWallet();
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
      const checkResponse = await fetch(`${API_BASE_URL}/claims/check/${eventId}/${publicKey}`);
      const existingClaim = checkResponse.ok ? await checkResponse.json() : null;

      // Only block if mint is already completed
      if (existingClaim?.status === 'completed' && existingClaim?.mint_address) {
        setClaimed(true);
        toast.success('Attendance NFT already claimed.');
        onSuccess?.();
        return;
      }

      let claimIdToUse: string;

      if (existingClaim?.id) {
        // Use existing claim ID
        claimIdToUse = existingClaim.id;
      } else {
        // Create new claim record
        const createClaimResponse = await fetch(`${API_BASE_URL}/claims`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            wallet_address: publicKey,
            signature: signature,
            status: 'pending',
          }),
        });

        if (!createClaimResponse.ok) {
          throw new Error('Failed to create claim');
        }

        const claim = await createClaimResponse.json();
        claimIdToUse = claim.id;
      }

      // Call backend to mint NFT
      const mintResponse = await fetch(`${API_BASE_URL}/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: claimIdToUse,
          eventId,
          walletAddress: publicKey,
          signature,
        }),
      });

      const mintResult = await mintResponse.json();

      if (!mintResponse.ok || !mintResult?.success) {
        throw new Error(mintResult?.error || 'Mint failed');
      }

      setClaimed(true);
      toast.success('Attendance NFT claimed successfully!');
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to claim NFT:', error);
      setError(error.message || 'Failed to claim NFT');
      toast.error(error.message || 'Failed to claim NFT');
    } finally {
      setClaiming(false);
    }
  };

  if (claimed) {
    return (
      <GlowCard glowColor="cyan" className="text-center py-8">
        <CheckCircle2 className="h-16 w-16 mx-auto text-neon-green mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">NFT Claimed!</h3>
        <p className="text-muted-foreground">
          Your Attest NFT has been minted and sent to your wallet.
        </p>
      </GlowCard>
    );
  }

  if (error) {
    return (
      <GlowCard glowColor="pink" className="text-center py-8">
        <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Claim Failed</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button
          onClick={() => setError(null)}
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10"
        >
          Try Again
        </Button>
      </GlowCard>
    );
  }

  return (
    <GlowCard className="text-center py-8">
      <Gift className="h-16 w-16 mx-auto text-primary mb-4 animate-float" />
      <h3 className="text-2xl font-bold text-foreground mb-2">Claim Your NFT</h3>
      <p className="text-muted-foreground mb-6">
        {connected
          ? 'Click below to claim your Attendance NFT'
          : 'Connect your wallet to claim your Attendance NFT'}
      </p>

      <Button
        onClick={handleClaim}
        disabled={!connected || claiming}
        className="bg-primary text-primary-foreground hover:bg-primary/90 glow px-8 py-6 text-lg"
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
