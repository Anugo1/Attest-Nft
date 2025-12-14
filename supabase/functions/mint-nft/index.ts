import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { claimId, eventId, walletAddress, signature } = await req.json();

    console.log('Mint NFT request:', { claimId, eventId, walletAddress });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Update claim status to minting
    await supabase
      .from('claims')
      .update({ status: 'minting' })
      .eq('id', claimId);

    // In production, you would:
    // 1. Use Metaplex JS SDK to create the NFT
    // 2. Upload metadata to Arweave/Bundlr
    // 3. Mint the NFT to the user's wallet
    
    // For devnet demo, we simulate the mint
    const mockMintAddress = `${walletAddress.slice(0, 8)}...NFT${Date.now().toString(36)}`;
    const mockSignature = `sig_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

    // Update claim with mint details
    const { error: updateError } = await supabase
      .from('claims')
      .update({
        mint_address: mockMintAddress,
        signature: mockSignature,
        status: 'completed',
      })
      .eq('id', claimId);

    if (updateError) {
      throw updateError;
    }

    console.log('NFT minted successfully:', { mintAddress: mockMintAddress });

    return new Response(
      JSON.stringify({
        success: true,
        mintAddress: mockMintAddress,
        signature: mockSignature,
        message: 'NFT minted successfully!',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Mint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
