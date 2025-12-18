// Node.js backend API adapter
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return { data, error: null };
}

export const api = {
  // Events
  async getEvents() {
    return await request('/events');
  },

  async getEventById(id: string) {
    return await request(`/events/${id}`);
  },

  async getEventByCode(code: string) {
    return await request(`/events/code/${code.toUpperCase()}`);
  },

  async createEvent(eventData: any) {
    return await request('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  // Claims
  async getClaimCount(eventId: string) {
    return await request(`/claims/count/${eventId}`);
  },

  async checkExistingClaim(eventId: string, walletAddress: string) {
    return await request(`/claims/check/${eventId}/${walletAddress}`);
  },
};
