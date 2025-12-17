import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { GlowCard } from '@/components/GlowCard';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { ClaimNFT } from '@/components/ClaimNFT';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-adapter';
import { useWallet } from '@/hooks/useWallet';
import { format } from 'date-fns';
import { Loader2, Calendar, MapPin, Users, ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  event_date: string;
  organizer_wallet: string;
  nft_image_url: string | null;
  max_claims: number | null;
  claim_code: string;
  is_active: boolean;
}

const EventDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { publicKey } = useWallet();
  const [event, setEvent] = useState<Event | null>(null);
  const [claimCount, setClaimCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data: eventData, error } = await api.getEventById(id!);

      if (error) throw error;

      setEvent(eventData);

      // Get claim count
      const { count } = await api.getClaimCount(id!);

      setClaimCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyClaimLink = () => {
    if (event) {
      const claimUrl = `${window.location.origin}/claim/${event.claim_code}`;
      navigator.clipboard.writeText(claimUrl);
      setCopied(true);
      toast.success('Claim link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isOrganizer = publicKey === event?.organizer_wallet;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-32">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <Link to="/events">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <Link to="/events" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Event Details */}
            <div>
              {event.nft_image_url && (
                <GlowCard className="mb-6 p-0 overflow-hidden">
                  <img
                    src={event.nft_image_url}
                    alt={event.name}
                    className="w-full h-64 object-cover"
                  />
                </GlowCard>
              )}

              <GlowCard>
                <h1 className="text-3xl font-bold text-gradient mb-4">{event.name}</h1>
                
                {event.description && (
                  <p className="text-muted-foreground mb-6">{event.description}</p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>{format(new Date(event.event_date), 'PPP @ p')}</span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-3 text-foreground">
                      <MapPin className="h-5 w-5 text-accent" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 text-foreground">
                    <Users className="h-5 w-5 text-secondary" />
                    <span>
                      {claimCount} / {event.max_claims || '∞'} claimed
                      {event.max_claims && claimCount >= event.max_claims && (
                        <span className="ml-2 text-xs text-destructive font-semibold">(FULL)</span>
                      )}
                    </span>
                  </div>
                </div>

                {isOrganizer && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-3">Organizer Controls</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={copyClaimLink}
                        variant="outline"
                        className="border-primary/50 text-primary hover:bg-primary/10"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Claim Link
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                      Code: {event.claim_code}
                    </p>
                  </div>
                )}
              </GlowCard>
            </div>

            {/* QR Code & Claim */}
            <div className="space-y-6">
              <QRCodeDisplay
                data={`${window.location.origin}/claim/${event.claim_code}`}
                title="Scan to Claim NFT"
              />

              {!isOrganizer && (
                <>
                  <ClaimNFT
                    eventId={event.id}
                    eventName={event.name}
                    claimCode={event.claim_code}
                    onSuccess={fetchEvent}
                  />
                  <GlowCard glowColor="cyan" className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Connect your Phantom wallet and sign to verify your attendance
                    </p>
                  </GlowCard>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventDetailPage;
