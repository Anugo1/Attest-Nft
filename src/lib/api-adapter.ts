import { supabase } from '@/integrations/supabase/client';
// Supabase-only API adapter (production)

export const api = {
  // Events
  async getEvents() {
    return await supabase.from('events').select('*').eq('is_active', true).order('event_date', { ascending: false });
  },

  async getEventById(id: string) {
    return await supabase.from('events').select('*').eq('id', id).single();
  },

  async getEventByCode(code: string) {
    return await supabase.from('events').select('*').eq('claim_code', code.toUpperCase()).eq('is_active', true).single();
  },

  async createEvent(eventData: any) {
    return await supabase.from('events').insert(eventData).select().single();
  },

  // Claims
  async getClaimCount(eventId: string) {
    return await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'completed');
  },

  async checkExistingClaim(eventId: string, walletAddress: string) {
    return await supabase.from('claims').select('id').eq('event_id', eventId).eq('wallet_address', walletAddress).single();
  },
};
