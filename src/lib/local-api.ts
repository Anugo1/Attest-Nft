// Local API client for testing without Supabase
const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3001';
const USE_LOCAL_API = import.meta.env.VITE_USE_LOCAL_API === 'true';

export const localApi = {
  isEnabled: () => USE_LOCAL_API,

  // Events
  async getEvents() {
    const res = await fetch(`${LOCAL_API_URL}/api/events`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async getEventById(id: string) {
    const res = await fetch(`${LOCAL_API_URL}/api/events/${id}`);
    if (!res.ok) throw new Error('Event not found');
    return res.json();
  },

  async getEventByCode(code: string) {
    const res = await fetch(`${LOCAL_API_URL}/api/events/code/${code}`);
    if (!res.ok) throw new Error('Event not found');
    return res.json();
  },

  async createEvent(eventData: any) {
    const res = await fetch(`${LOCAL_API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
  },

  // Claims
  async getClaimsForEvent(eventId: string) {
    const res = await fetch(`${LOCAL_API_URL}/api/claims/event/${eventId}`);
    if (!res.ok) throw new Error('Failed to fetch claims');
    return res.json();
  },

  async checkClaim(eventId: string, walletAddress: string) {
    const res = await fetch(`${LOCAL_API_URL}/api/claims/check/${eventId}/${walletAddress}`);
    if (!res.ok) throw new Error('Failed to check claim');
    return res.json();
  },

  async createClaim(claimData: any) {
    const res = await fetch(`${LOCAL_API_URL}/api/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claimData),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create claim');
    }
    return res.json();
  },

  // Mint NFT
  async mintNFT(mintData: { claimId: string; eventId: string; walletAddress: string; signature: string }) {
    const res = await fetch(`${LOCAL_API_URL}/api/mint-nft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mintData),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to mint NFT');
    }
    return data;
  },
};
