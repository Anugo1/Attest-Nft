import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { GlowCard } from '@/components/GlowCard';
import { ClaimNFT } from '@/components/ClaimNFT';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-adapter';
import { Loader2, Search, Gift } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  event_date: string;
  nft_image_url: string | null;
  claim_code: string;
}

const ClaimPage = () => {
  const { code } = useParams<{ code: string }>();
  const [claimCode, setClaimCode] = useState(code || '');
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (code) {
      searchEvent(code);
    }
  }, [code]);

  const searchEvent = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) return;

    setLoading(true);
    setSearched(true);
    
    try {
      const { data, error } = await api.getEventByCode(codeToSearch);

      if (error) {
        setEvent(null);
      } else {
        setEvent(data);
      }
    } catch (error) {
      console.error('Failed to search event:', error);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchEvent(claimCode);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <Gift className="h-16 w-16 mx-auto text-primary mb-4 animate-float" />
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-gradient">Claim</span> Your NFT
            </h1>
            <p className="text-muted-foreground">
              Enter your event claim code to receive your Attest NFT
            </p>
          </div>

          {!event && (
            <GlowCard className="mb-8">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                <Input
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                  placeholder="Enter claim code (e.g., ABC12345)"
                  className="bg-input border-border font-mono text-lg tracking-widest"
                  maxLength={8}
                />
                <Button
                  type="submit"
                  disabled={loading || !claimCode.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="sm:hidden">Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2 sm:mr-0" />
                      <span className="sm:hidden">Search</span>
                    </>
                  )}
                </Button>
              </form>
            </GlowCard>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {searched && !loading && !event && (
            <GlowCard glowColor="pink" className="text-center py-12">
              <h3 className="text-xl font-bold mb-2">Event Not Found</h3>
              <p className="text-muted-foreground">
                No active event found with code "{claimCode}". Please check and try again.
              </p>
            </GlowCard>
          )}

          {event && (
            <div className="space-y-6">
              <GlowCard>
                <div className="flex flex-col sm:flex-row gap-4">
                  {event.nft_image_url && (
                    <img
                      src={event.nft_image_url}
                      alt={event.name}
                      className="w-full sm:w-24 h-48 sm:h-24 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gradient">{event.name}</h2>
                    {event.description && (
                      <p className="text-muted-foreground text-sm mt-1">{event.description}</p>
                    )}
                    <p className="text-sm text-primary mt-2">
                      {format(new Date(event.event_date), 'PPP')}
                    </p>
                  </div>
                </div>
              </GlowCard>

              {/* On desktop, show QR + Mint side-by-side for symmetric alignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="w-full max-w-md mx-auto md:mx-0 md:justify-self-end">
                  <QRCodeDisplay
                    data={`${window.location.origin}/claim/${event.claim_code}`}
                    title="Share This QR Code"
                    size={200}
                  />
                </div>

                <div className="w-full max-w-md mx-auto md:mx-0 md:justify-self-start">
                  <ClaimNFT
                    eventId={event.id}
                    eventName={event.name}
                    claimCode={event.claim_code}
                  />
                </div>
              </div>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEvent(null);
                    setClaimCode('');
                    setSearched(false);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Search Different Event
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClaimPage;
