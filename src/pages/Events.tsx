import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { EventCard } from '@/components/EventCard';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-adapter';
import { Loader2, Plus, Calendar } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  event_date: string;
  max_claims: number | null;
  nft_image_url: string | null;
  claim_count?: number;
}

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error } = await api.getEvents();

      if (error) throw error;

      // Get claim counts for each event
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await api.getClaimCount(event.id);
          return { ...event, claim_count: count || 0 };
        })
      );

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="text-gradient">Active</span> Events
              </h1>
              <p className="text-muted-foreground">
                Browse and participate in Attest events
              </p>
            </div>
            
            <Link to="/events/create" className="mt-4 md:mt-0">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow">
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <GlowCard className="text-center py-16">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">No Events Yet</h3>
              <p className="text-muted-foreground mb-6">
                Be the first to create an Attest event!
              </p>
              <Link to="/events/create">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Event
                </Button>
              </Link>
            </GlowCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  name={event.name}
                  description={event.description}
                  location={event.location}
                  eventDate={event.event_date}
                  maxClaims={event.max_claims}
                  claimCount={event.claim_count}
                  nftImageUrl={event.nft_image_url}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EventsPage;
