import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlowCard } from './GlowCard';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Gift, CheckCircle2, XCircle } from 'lucide-react';

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
      const message = `Claim attendance NFT for event: ${eventName}\nCode: ${claimCode}\nTimestamp: ${Date.now()}`;
      const signature = await signMessage(message);

      if (!signature) {
        throw new Error('Failed to sign message');
      }

      // Check if already claimed
      const { data: existingClaim } = await supabase
        .from('claims')
        .select('id')
        .eq('event_id', eventId)
        .eq('wallet_address', publicKey)
        .single();

      if (existingClaim) {
        setError('You have already claimed this NFT');
        setClaiming(false);
        return;
      }

      // Create claim record
      const { data: claim, error: claimError } = await supabase
        .from('claims')
        .insert({
          event_id: eventId,
          wallet_address: publicKey,
          signature: signature,
          status: 'pending',
        })
        .select()
        .single();

      if (claimError) throw claimError;

      // Call edge function to mint NFT
      const { data: mintResult, error: mintError } = await supabase.functions.invoke('mint-nft', {
        body: {
          claimId: claim.id,
          eventId,
          walletAddress: publicKey,
          signature,
        },
      });

      if (mintError) throw mintError;

      setClaimed(true);
      toast.success('NFT claimed successfully!');
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
          Your attendance NFT has been minted and sent to your wallet.
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
          ? 'Click below to claim your attendance NFT'
          : 'Connect your wallet to claim your attendance NFT'}
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
            Claim NFT
          </>
        )}
      </Button>
    </GlowCard>
  );
}
