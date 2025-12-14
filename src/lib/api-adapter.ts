// API adapter that switches between Supabase and local API
import { supabase } from '@/integrations/supabase/client';
import { localApi } from './local-api';

const useLocal = () => localApi.isEnabled();

export const api = {
  // Events
  async getEvents() {
    if (useLocal()) {
      return { data: await localApi.getEvents(), error: null };
    }
    return await supabase.from('events').select('*').eq('is_active', true).order('event_date', { ascending: false });
  },

  async getEventById(id: string) {
    if (useLocal()) {
      try {
        const data = await localApi.getEventById(id);
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    }
    return await supabase.from('events').select('*').eq('id', id).single();
  },

  async getEventByCode(code: string) {
    if (useLocal()) {
      try {
        const data = await localApi.getEventByCode(code);
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    }
    return await supabase.from('events').select('*').eq('claim_code', code.toUpperCase()).eq('is_active', true).single();
  },

  async createEvent(eventData: any) {
    if (useLocal()) {
      try {
        const data = await localApi.createEvent(eventData);
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    }
    return await supabase.from('events').insert(eventData).select().single();
  },

  // Claims
  async getClaimCount(eventId: string) {
    if (useLocal()) {
      const result = await localApi.getClaimsForEvent(eventId);
      return { count: result.count };
    }
    return await supabase.from('claims').select('*', { count: 'exact', head: true }).eq('event_id', eventId);
  },

  async checkExistingClaim(eventId: string, walletAddress: string) {
    if (useLocal()) {
      const result = await localApi.checkClaim(eventId, walletAddress);
      return { data: result.claimed ? result.claim : null, error: null };
    }
    return await supabase.from('claims').select('id').eq('event_id', eventId).eq('wallet_address', walletAddress).single();
  },
};
