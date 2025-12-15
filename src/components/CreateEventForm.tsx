import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { GlowCard } from './GlowCard';
import { useWallet } from '@/hooks/useWallet';
import { api } from '@/lib/api-adapter';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const eventSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  eventDate: z.string().min(1, 'Event date is required'),
  maxClaims: z.number().min(1).max(10000).optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

export function CreateEventForm() {
  const { connected, publicKey } = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      maxClaims: 100,
    },
  });

  const generateClaimCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const onSubmit = async (data: EventFormData) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setSubmitting(true);
    try {
      const claimCode = generateClaimCode();
      
      const { data: event, error } = await api.createEvent({
        name: data.name,
        description: data.description || null,
        location: data.location || null,
        event_date: new Date(data.eventDate).toISOString(),
        organizer_wallet: publicKey,
        max_claims: data.maxClaims || 1000,
        claim_code: claimCode,
      });

      if (error) throw error;

      toast.success('Event created successfully!');
      navigate(`/events/${event.id}`);
    } catch (error: any) {
      console.error('Failed to create event:', error);
      toast.error(error.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <GlowCard className="text-center py-12">
        <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
        <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground">
          Connect your Phantom wallet to create an event
        </p>
      </GlowCard>
    );
  }

  return (
    <GlowCard>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Event Name *</Label>
          <Input
            id="name"
            placeholder="My Awesome Event"
            className="bg-input border-border"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Tell attendees about your event..."
            className="bg-input border-border min-h-24"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Virtual / Physical address"
              className="bg-input border-border"
              {...register('location')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDate">Event Date *</Label>
            <Input
              id="eventDate"
              type="datetime-local"
              className="bg-input border-border"
              {...register('eventDate')}
            />
            {errors.eventDate && (
              <p className="text-sm text-destructive">{errors.eventDate.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxClaims">Max Claims</Label>
            <Input
              id="maxClaims"
              type="number"
              placeholder="100"
              className="bg-input border-border"
              {...register('maxClaims', { valueAsNumber: true })}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Event...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Event
            </>
          )}
        </Button>
      </form>
    </GlowCard>
  );
}
