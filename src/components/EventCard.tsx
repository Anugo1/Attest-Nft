import { Link } from 'react-router-dom';
import { GlowCard } from './GlowCard';
import { Button } from './ui/button';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface EventCardProps {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  eventDate: string;
  maxClaims: number | null;
  claimCount?: number;
  nftImageUrl: string | null;
}

export function EventCard({
  id,
  name,
  description,
  location,
  eventDate,
  maxClaims,
  claimCount = 0,
  nftImageUrl,
}: EventCardProps) {
  return (
    <GlowCard className="flex flex-col h-full">
      {nftImageUrl && (
        <div className="relative -mx-6 -mt-6 mb-4 h-48 overflow-hidden rounded-t-lg">
          <img
            src={nftImageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        </div>
      )}
      
      <h3 className="text-xl font-bold text-foreground mb-2">{name}</h3>
      
      {description && (
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{description}</p>
      )}
      
      <div className="flex flex-col gap-2 mb-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{format(new Date(eventDate), 'PPP')}</span>
        </div>
        
        {location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-accent" />
            <span>{location}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4 text-secondary" />
          <span>{claimCount} / {maxClaims || '∞'} claimed</span>
        </div>
      </div>
      
      <div className="mt-auto pt-4">
        <Link to={`/events/${id}`}>
          <Button className="w-full bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground transition-all">
            View Event
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </GlowCard>
  );
}
