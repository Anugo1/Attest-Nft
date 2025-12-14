-- Create events table for storing attendance events
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  organizer_wallet TEXT NOT NULL,
  nft_image_url TEXT,
  nft_metadata_uri TEXT,
  max_claims INTEGER DEFAULT 1000,
  claim_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create claims table for tracking NFT claims
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  mint_address TEXT,
  signature TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'minting', 'completed', 'failed')),
  UNIQUE(event_id, wallet_address)
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Public read access for active events
CREATE POLICY "Anyone can view active events" 
ON public.events 
FOR SELECT 
USING (is_active = true);

-- Anyone can insert events (organizers create via wallet)
CREATE POLICY "Anyone can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (true);

-- Organizers can update their own events
CREATE POLICY "Organizers can update their events" 
ON public.events 
FOR UPDATE 
USING (true);

-- Public read access for claims
CREATE POLICY "Anyone can view claims" 
ON public.claims 
FOR SELECT 
USING (true);

-- Anyone can create claims
CREATE POLICY "Anyone can create claims" 
ON public.claims 
FOR INSERT 
WITH CHECK (true);

-- Claims can be updated
CREATE POLICY "Claims can be updated" 
ON public.claims 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_events_claim_code ON public.events(claim_code);
CREATE INDEX idx_events_organizer ON public.events(organizer_wallet);
CREATE INDEX idx_claims_event ON public.claims(event_id);
CREATE INDEX idx_claims_wallet ON public.claims(wallet_address);