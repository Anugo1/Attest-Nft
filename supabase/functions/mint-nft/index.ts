import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base58Decode } from "https://deno.land/std@0.168.0/encoding/base58.ts";

// NOTE: Solana deps (web3.js, spl-token) are intentionally lazy-loaded inside the POST handler.
// This keeps CORS preflight (OPTIONS) fast and avoids worker startup failures due to heavy imports.

function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function u32le(n: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = n & 0xff;
  out[1] = (n >> 8) & 0xff;
  out[2] = (n >> 16) & 0xff;
  out[3] = (n >> 24) & 0xff;
  return out;
}

function u16le(n: number): Uint8Array {
  const out = new Uint8Array(2);
  out[0] = n & 0xff;
  out[1] = (n >> 8) & 0xff;
  return out;
}

function u64le(n: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let x = n;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildEventBadgeSvg(params: {
  eventName: string;
  eventDate: string;
  location?: string | null;
}): string {
  const name = escapeXml(params.eventName);
  const date = escapeXml(params.eventDate);
  const location = params.location ? escapeXml(params.location) : '';

  // 1000x1000 square so wallets render nicely.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1020"/>
      <stop offset="50%" stop-color="#1B1146"/>
      <stop offset="100%" stop-color="#0B1020"/>
    </linearGradient>
    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#A855F7"/>
      <stop offset="50%" stop-color="#22D3EE"/>
      <stop offset="100%" stop-color="#A855F7"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="1000" height="1000" fill="url(#bg)"/>
  <rect x="70" y="70" width="860" height="860" rx="48" fill="rgba(0,0,0,0.25)" stroke="url(#stroke)" stroke-width="6" filter="url(#glow)"/>

  <text x="130" y="210" fill="#E9D5FF" font-size="44" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" letter-spacing="4">ATTEST</text>
  <text x="130" y="300" fill="#FFFFFF" font-size="58" font-weight="700" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto">Proof of Attendance</text>

  <foreignObject x="130" y="360" width="740" height="260">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; color: white;">
      <div style="font-size: 54px; font-weight: 800; line-height: 1.1;">${name}</div>
    </div>
  </foreignObject>

  <rect x="130" y="650" width="740" height="1" fill="rgba(255,255,255,0.18)"/>

  <text x="130" y="730" fill="#C4B5FD" font-size="34" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto">DATE</text>
  <text x="130" y="790" fill="#FFFFFF" font-size="40" font-weight="700" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto">${date}</text>

  ${location ? `
  <text x="130" y="860" fill="#C4B5FD" font-size="28" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto">${location}</text>
  ` : ''}

  <circle cx="860" cy="210" r="10" fill="#22D3EE"/>
  <circle cx="892" cy="210" r="10" fill="#A855F7"/>
</svg>`;
}

// Solana-specific helpers live inside the POST handler (lazy import) so OPTIONS stays lightweight.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const requested = req.headers.get('Access-Control-Request-Headers');
    const headers = {
      ...corsHeaders,
      // Don't require function startup for CORS – reply quickly.
      ...(requested ? { 'Access-Control-Allow-Headers': requested } : {}),
    };
    return new Response(null, { status: 200, headers });
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  let claimId: string | null = null;

  try {
    const body = await req.json();
    claimId = body?.claimId ?? null;
    const { eventId, walletAddress, signature } = body;

    console.log('Mint NFT request:', { claimId, eventId, walletAddress });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseKey);

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Load claim and enforce idempotency
    const { data: claim, error: claimFetchError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (claimFetchError || !claim) {
      throw new Error('Claim not found');
    }

    if (claim.event_id !== eventId || claim.wallet_address !== walletAddress) {
      throw new Error('Claim does not match event or wallet');
    }

    if (claim.status === 'completed' && claim.mint_address) {
      return new Response(
        JSON.stringify({
          success: true,
          mintAddress: claim.mint_address,
          signature: claim.signature,
          message: 'Already minted',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update claim status to minting
    await supabase
      .from('claims')
      .update({ status: 'minting' })
      .eq('id', claimId);

    const payerSecretKey = Deno.env.get('SOLANA_PAYER_SECRET_KEY');
    if (!payerSecretKey) {
      throw new Error('SOLANA_PAYER_SECRET_KEY not configured');
    }

    // Lazy-load Solana deps (large) only for POST mint calls.
    // Pin deno-std to avoid missing Node polyfill modules during deploy/runtime.
    const solanaWeb3 = await import(
      "https://esm.sh/@solana/web3.js@1.87.6?target=deno&no-check&deno-std=0.224.0"
    );
    const splToken = await import(
      "https://esm.sh/@solana/spl-token@0.3.8?target=deno&no-check&deno-std=0.224.0"
    );

    const {
      Connection,
      Keypair,
      PublicKey,
      Transaction,
      SystemProgram,
      clusterApiUrl,
      sendAndConfirmTransaction,
      TransactionInstruction,
      SYSVAR_RENT_PUBKEY,
    } = solanaWeb3;

    const {
      createMint,
      getOrCreateAssociatedTokenAccount,
      mintTo,
      TOKEN_PROGRAM_ID,
      createSetAuthorityInstruction,
      AuthorityType,
    } = splToken;

    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
      'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    );

    const enc = new TextEncoder();

    const findMetadataPda = (mint: InstanceType<typeof PublicKey>) => {
      const [pda] = PublicKey.findProgramAddressSync(
        [enc.encode('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID
      );
      return pda;
    };

    const findMasterEditionPda = (mint: InstanceType<typeof PublicKey>) => {
      const [pda] = PublicKey.findProgramAddressSync(
        [
          enc.encode('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          enc.encode('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );
      return pda;
    };

    const createMetadataInstruction = (
      metadata: InstanceType<typeof PublicKey>,
      mint: InstanceType<typeof PublicKey>,
      mintAuthority: InstanceType<typeof PublicKey>,
      payer: InstanceType<typeof PublicKey>,
      updateAuthority: InstanceType<typeof PublicKey>,
      name: string,
      symbol: string,
      uri: string
    ) => {
      const keys = [
        { pubkey: metadata, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: mintAuthority, isSigner: true, isWritable: false },
        { pubkey: payer, isSigner: true, isWritable: false },
        { pubkey: updateAuthority, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ];

      // Instruction discriminator for CreateMetadataAccountV3
      const discriminator = new Uint8Array([33]);

      const nameBytes = enc.encode(name);
      const symbolBytes = enc.encode(symbol);
      const uriBytes = enc.encode(uri);

      const data = concatBytes([
        discriminator,
        u32le(nameBytes.length),
        nameBytes,
        u32le(symbolBytes.length),
        symbolBytes,
        u32le(uriBytes.length),
        uriBytes,
        u16le(0),
        new Uint8Array([0]),
        new Uint8Array([0]),
        new Uint8Array([0]),
        new Uint8Array([0]),
        new Uint8Array([0]),
      ]);

      return new TransactionInstruction({
        keys,
        programId: TOKEN_METADATA_PROGRAM_ID,
        data,
      });
    };

    const createMasterEditionInstruction = (
      edition: InstanceType<typeof PublicKey>,
      mint: InstanceType<typeof PublicKey>,
      updateAuthority: InstanceType<typeof PublicKey>,
      mintAuthority: InstanceType<typeof PublicKey>,
      payer: InstanceType<typeof PublicKey>,
      metadata: InstanceType<typeof PublicKey>,
      maxSupply: number | null
    ) => {
      const keys = [
        { pubkey: edition, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: updateAuthority, isSigner: true, isWritable: false },
        { pubkey: mintAuthority, isSigner: true, isWritable: false },
        { pubkey: payer, isSigner: true, isWritable: false },
        { pubkey: metadata, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ];

      const discriminator = new Uint8Array([17]);
      const maxSupplyBuffer =
        maxSupply !== null
          ? concatBytes([new Uint8Array([1]), u64le(BigInt(maxSupply))])
          : new Uint8Array([0]);

      const data = concatBytes([discriminator, maxSupplyBuffer]);

      return new TransactionInstruction({
        keys,
        programId: TOKEN_METADATA_PROGRAM_ID,
        data,
      });
    };

    const rpcUrl = Deno.env.get('SOLANA_RPC_URL') || clusterApiUrl('devnet');
    const connection = new Connection(rpcUrl, 'confirmed');

    // Decode the base58 private key
    const payerKeypair = Keypair.fromSecretKey(base58Decode(payerSecretKey));
    const recipient = new PublicKey(walletAddress);

    const eventDate = new Date(event.event_date).toISOString().split('T')[0];

    // Ensure we have an image URL (Option C: auto-generate badge if missing)
    let imageUrl: string | null = event.nft_image_url || null;
    if (!imageUrl) {
      const imageBucket = Deno.env.get('NFT_IMAGE_BUCKET') || 'nft-images';
      const objectPath = `events/${eventId}/badge.svg`;
      const svg = buildEventBadgeSvg({
        eventName: event.name,
        eventDate,
        location: event.location,
      });
      const payload = new TextEncoder().encode(svg);

      const { error: uploadError } = await supabase.storage
        .from(imageBucket)
        .upload(objectPath, payload, {
          contentType: 'image/svg+xml',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload generated NFT image: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from(imageBucket).getPublicUrl(objectPath);
      imageUrl = urlData.publicUrl;

      // Persist to event so future mints reuse the same image
      await supabase
        .from('events')
        .update({ nft_image_url: imageUrl })
        .eq('id', eventId);
    }

    // Prepare metadata
    const metadata = {
      name: `${event.name} - Attendance`,
      symbol: 'ATTEND',
      description: `Proof of attendance for ${event.name}`,
      image: imageUrl || '',
      attributes: [
        { trait_type: 'Event', value: event.name },
        { trait_type: 'Event ID', value: eventId },
        { trait_type: 'Date', value: eventDate },
        { trait_type: 'Type', value: 'Attendance' },
        ...(event.location ? [{ trait_type: 'Location', value: event.location }] : []),
      ],
      properties: {
        category: 'image',
        files: imageUrl ? [{ uri: imageUrl, type: imageUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png' }] : [],
      },
    };

    // Upload metadata to Supabase Storage
    let uri: string | null = event.nft_metadata_uri || null;
    if (!uri) {
      const bucket = Deno.env.get('NFT_METADATA_BUCKET') || 'nft-metadata';
      const objectPath = `events/${eventId}/metadata.json`;

      const payload = new TextEncoder().encode(JSON.stringify(metadata));
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, payload, {
          contentType: 'application/json',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to upload metadata to Supabase Storage: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      uri = urlData.publicUrl;

      // Persist to event so future mints reuse the same metadata
      await supabase
        .from('events')
        .update({ nft_metadata_uri: uri })
        .eq('id', eventId);
    }

    console.log('Creating Metaplex NFT with metadata:', uri);

    // Step 1: Create mint account
    const mint = await createMint(
      connection,
      payerKeypair,
      payerKeypair.publicKey, // mint authority
      payerKeypair.publicKey, // freeze authority
      0 // decimals = 0 for NFT
    );

    console.log('Mint created:', mint.toBase58());

    // Step 2: Create associated token account for recipient
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      mint,
      recipient
    );

    console.log('Recipient token account:', recipientTokenAccount.address.toBase58());

    // Step 3: Mint 1 token to recipient
    await mintTo(
      connection,
      payerKeypair,
      mint,
      recipientTokenAccount.address,
      payerKeypair.publicKey,
      1
    );

    console.log('Minted 1 token to recipient');

    // Step 4: Create Metadata Account
    const metadataPda = findMetadataPda(mint);
    const masterEditionPda = findMasterEditionPda(mint);

    const transaction = new Transaction();

    // Add create metadata instruction
    transaction.add(
      createMetadataInstruction(
        metadataPda,
        mint,
        payerKeypair.publicKey,
        payerKeypair.publicKey,
        payerKeypair.publicKey,
        metadata.name,
        metadata.symbol,
        uri
      )
    );

    // Add create master edition instruction (makes it a true NFT with max supply = 0)
    transaction.add(
      createMasterEditionInstruction(
        masterEditionPda,
        mint,
        payerKeypair.publicKey,
        payerKeypair.publicKey,
        payerKeypair.publicKey,
        metadataPda,
        0 // maxSupply = 0 means unique NFT
      )
    );

    // Send transaction
    const metadataTxSig = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payerKeypair],
      { commitment: 'confirmed' }
    );

    console.log('Metadata created, signature:', metadataTxSig);

    // Step 5: Revoke mint authority (make it immutable)
    const revokeTx = new Transaction().add(
      createSetAuthorityInstruction(
        mint,
        payerKeypair.publicKey,
        AuthorityType.MintTokens,
        null
      )
    );
    await sendAndConfirmTransaction(connection, revokeTx, [payerKeypair], { commitment: 'confirmed' });

    console.log('Mint authority revoked - NFT is now immutable');

    const mintAddress = mint.toBase58();
    const txSig = metadataTxSig;

    const { error: updateError } = await supabase
      .from('claims')
      .update({
        mint_address: mintAddress,
        signature: txSig,
        status: 'completed',
      })
      .eq('id', claimId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        mintAddress,
        signature: txSig,
        metadataUri: uri,
        message: 'NFT minted successfully!',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Mint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (supabase && claimId) {
      try {
        await supabase.from('claims').update({ status: 'failed' }).eq('id', claimId);
      } catch {
        // ignore
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
