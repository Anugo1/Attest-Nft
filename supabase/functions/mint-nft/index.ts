// FIXED VERSION: Supabase Edge Function – Solana NFT Mint (Metaplex compatible)

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base58Decode } from "https://deno.land/std@0.168.0/encoding/base58.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  let claimId: string | null = null;

  try {
    // ---------------- Solana imports (lazy) ----------------
    const {
      Connection,
      Keypair,
      PublicKey,
      Transaction,
      clusterApiUrl,
      sendAndConfirmTransaction,
    } = await import("npm:@solana/web3.js@1.98.4");

    const {
      createMint,
      getOrCreateAssociatedTokenAccount,
      mintTo,
      createSetAuthorityInstruction,
      AuthorityType,
    } = await import("npm:@solana/spl-token@0.4.8");

    // ✅ Metaplex import (correct for Deno)
    const metaplexModule = await import(
      "npm:@metaplex-foundation/mpl-token-metadata@3.2.1"
    );

    const {
      createCreateMetadataAccountV3Instruction,
      createCreateMasterEditionV3Instruction,
    } = metaplexModule.instructions ?? {};

    if (!createCreateMetadataAccountV3Instruction) {
      throw new Error('createCreateMetadataAccountV3Instruction not found in module.instructions');
    }
    if (!createCreateMasterEditionV3Instruction) {
      throw new Error('createCreateMasterEditionV3Instruction not found in module.instructions');
    }

    // ✅ PROGRAM_ID is already a PublicKey in v3
    const TOKEN_METADATA_PROGRAM_ID = metaplexModule.PROGRAM_ID ??
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

    // ---------------- Request body ----------------
    const body = await req.json();
    claimId = body?.claimId ?? null;
    const { eventId, walletAddress } = body;

    if (!claimId || !eventId || !walletAddress) {
      throw new Error('Missing required fields');
    }

    // ---------------- Supabase ----------------
    supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (!event) throw new Error('Event not found');

    const { data: claim } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (!claim) throw new Error('Claim not found');

    if (claim.status === 'completed' && claim.mint_address) {
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    await supabase.from('claims').update({ status: 'minting' }).eq('id', claimId);

    // ---------------- Wallet ----------------
    const secret = base58Decode(Deno.env.get('SOLANA_PAYER_SECRET_KEY')!);
    const payer = Keypair.fromSecretKey(secret);

    const connection = new Connection(
      Deno.env.get('SOLANA_RPC_URL') ?? clusterApiUrl('devnet'),
      'confirmed'
    );

    const recipient = new PublicKey(walletAddress);

    // ---------------- Mint ----------------
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      0
    );

    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient
    );

    await mintTo(connection, payer, mint, ata.address, payer.publicKey, 1);

    // ---------------- PDAs ----------------
    const enc = new TextEncoder();

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [enc.encode('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );

    const [editionPda] = PublicKey.findProgramAddressSync(
      [enc.encode('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer(), enc.encode('edition')],
      TOKEN_METADATA_PROGRAM_ID
    );

    // ---------------- Metadata ----------------
    const tx = new Transaction();

    tx.add(
      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPda,
          mint,
          mintAuthority: payer.publicKey,
          payer: payer.publicKey,
          updateAuthority: payer.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: `${event.name} - Attendance`,
              symbol: 'ATTEND',
              uri: event.nft_metadata_uri,
              sellerFeeBasisPoints: 0,
              creators: null,
              collection: null,
              uses: null,
            },
            isMutable: false,
            collectionDetails: null,
          },
        }
      )
    );

    tx.add(
      createCreateMasterEditionV3Instruction(
        {
          edition: editionPda,
          mint,
          updateAuthority: payer.publicKey,
          mintAuthority: payer.publicKey,
          payer: payer.publicKey,
          metadata: metadataPda,
        },
        { createMasterEditionArgs: { maxSupply: 0 } }
      )
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);

    // ---------------- Revoke mint authority ----------------
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        createSetAuthorityInstruction(
          mint,
          payer.publicKey,
          AuthorityType.MintTokens,
          null
        )
      ),
      [payer]
    );

    await supabase.from('claims').update({
      status: 'completed',
      mint_address: mint.toBase58(),
      signature: sig,
    }).eq('id', claimId);

    return new Response(JSON.stringify({ success: true, mint: mint.toBase58(), sig }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(err);
    if (supabase && claimId) {
      await supabase.from('claims').update({ status: 'failed' }).eq('id', claimId);
    }
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});