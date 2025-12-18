// Node.js backend API client
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
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

    return data;
  }

  // Events
  async getEvents() {
    return this.request('/events');
  }

  async getEventById(id) {
    return this.request(`/events/${id}`);
  }

  async getEventByCode(code) {
    return this.request(`/events/code/${code}`);
  }

  async createEvent(eventData) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  // Claims
  async getClaimCount(eventId) {
    const data = await this.request(`/claims/count/${eventId}`);
    return { count: data.count };
  }

  async checkExistingClaim(eventId, walletAddress) {
    return this.request(`/claims/check/${eventId}/${walletAddress}`);
  }

  // Minting
  async mintNFT(claimId, eventId, walletAddress, signature) {
    return this.request('/mint', {
      method: 'POST',
      body: JSON.stringify({
        claimId,
        eventId,
        walletAddress,
        signature,
      }),
    });
  }
}

export const api = new ApiClient();
