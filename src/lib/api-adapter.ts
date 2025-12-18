// Node.js backend API adapter
const rawBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
export const API_BASE_URL = rawBaseUrl.endsWith("/api") ? rawBaseUrl : `${rawBaseUrl}/api`;

type ApiResponse<T> = { data: T; error: null };

type ApiErrorPayload = {
  error?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getErrorFromPayload = (payload: unknown): string | null => {
  if (!isRecord(payload)) return null;
  const err = (payload as ApiErrorPayload).error;
  return typeof err === "string" && err.length > 0 ? err : null;
};

async function request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  const contentType = response.headers.get("content-type") || "";
  const data: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (typeof data === "string") {
      throw new Error(data || `API request failed (${response.status})`);
    }
    const payloadError = getErrorFromPayload(data);
    throw new Error(payloadError || `API request failed (${response.status})`);
  }

  return { data: data as T, error: null };
}

export type Event = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  event_date: string;
  organizer_wallet: string;
  nft_image_url: string | null;
  nft_metadata_uri?: string | null;
  max_claims: number | null;
  claim_code: string;
  is_active?: boolean;
};

export type ClaimStatus = "pending" | "minting" | "completed" | "failed";

export type Claim = {
  id: string;
  event_id: string;
  wallet_address: string;
  mint_address?: string;
  signature?: string;
  status: ClaimStatus;
};

export type CreateEventRequest = {
  name: string;
  description: string | null;
  location: string | null;
  event_date: string;
  organizer_wallet: string;
  max_claims: number;
  claim_code: string;
};

export type CreateClaimRequest = {
  event_id: string;
  wallet_address: string;
  signature: string;
  status?: ClaimStatus;
};

export const api = {
  // Events
  async getEvents() {
    return await request<Event[]>("/events");
  },

  async getEventById(id: string) {
    return await request<Event>(`/events/${id}`);
  },

  async getEventByCode(code: string) {
    return await request<Event>(`/events/code/${code.toUpperCase()}`);
  },

  async createEvent(eventData: CreateEventRequest) {
    return await request<Event>("/events", {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  },

  // Claims
  async createClaim(claimData: CreateClaimRequest) {
    return await request<Claim>("/claims", {
      method: "POST",
      body: JSON.stringify(claimData),
    });
  },

  async getClaimCount(eventId: string) {
    const { data } = await request<{ count: number }>(`/claims/count/${eventId}`);
    return { count: typeof data?.count === "number" ? data.count : 0 };
  },

  async checkExistingClaim(eventId: string, walletAddress: string) {
    return await request<Claim | null>(`/claims/check/${eventId}/${walletAddress}`);
  },

  // Minting
  async mintNFT(claimId: string, eventId: string, walletAddress: string, signature: string) {
    return await request<{
      success: boolean;
      mintAddress?: string;
      signature?: string;
      message?: string;
    }>("/mint", {
      method: "POST",
      body: JSON.stringify({
        claimId,
        eventId,
        walletAddress,
        signature,
      }),
    });
  },
};
