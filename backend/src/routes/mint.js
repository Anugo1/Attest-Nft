import express from 'express';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
  SendTransactionError,
} from '@solana/web3.js';
import {
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token';
import bs58 from 'bs58';
import {
  createCreateMetadataAccountV3Instruction,
  createCreateMasterEditionV3Instruction,
} from '@metaplex-foundation/mpl-token-metadata';
import Event from '../models/Event.js';
import Claim from '../models/Claim.js';
import { generateEventNftAssets } from '../lib/nft-assets.js';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

const router = express.Router();

// Mint NFT endpoint
router.post('/', async (req, res) => {
  const { claimId, eventId, walletAddress, signature } = req.body;

  try {
    // Validate required fields
    if (!claimId || !eventId || !walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Get event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found' 
      });
    }

    // Get claim
    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found',
      });
    }

    // Validate claim belongs to event + wallet
    if (claim.event_id?.toString?.() !== eventId) {
      return res.status(400).json({
        success: false,
        error: 'Claim does not belong to this event',
      });
    }

    if (claim.wallet_address !== walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Claim does not belong to this wallet',
      });
    }

    // Check if already minted
    if (claim.status === 'completed' && claim.mint_address) {
      return res.json({
        success: true,
        mintAddress: claim.mint_address,
        signature: claim.signature,
        message: 'Already minted',
      });
    }

    // Avoid double-mint while an in-flight mint is running
    if (claim.status === 'minting') {
      return res.status(409).json({
        success: false,
        error: 'Mint already in progress',
      });
    }

    // Update claim status to minting
    claim.status = 'minting';
    await claim.save();

    // Setup Solana connection
    const payerSecretKey = process.env.SOLANA_PAYER_SECRET_KEY;
    if (!payerSecretKey) {
      throw new Error('SOLANA_PAYER_SECRET_KEY not configured');
    }

    const secretKeyBytes = bs58.decode(payerSecretKey);
    if (secretKeyBytes.length !== 64) {
      throw new Error(`Invalid secret key length: ${secretKeyBytes.length}`);
    }

    const payer = Keypair.fromSecretKey(secretKeyBytes);
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
    const connection = new Connection(rpcUrl, 'confirmed');
    const recipient = new PublicKey(walletAddress);

    // Ensure the event has a publicly reachable metadata URI (wallets fetch image from this JSON)
    // Option B: generate an image (background + event inscription) + JSON metadata on-demand.
    if (!event.nft_metadata_uri) {
      const publicBaseUrl = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`)
        .replace(/\/+$/, '');
      const backgroundPath = process.env.NFT_BACKGROUND_PATH; // optional absolute/relative path
      const storage = process.env.NFT_ASSET_STORAGE || 'local';

      const { imageUrl, metadataUrl, metadataIpfsUri } = await generateEventNftAssets({
        event: event.toJSON ? event.toJSON() : event,
        publicBaseUrl,
        backgroundPath,
        storage,
      });

      event.nft_image_url = imageUrl;
      // Prefer ipfs:// CID for on-chain metadata (shorter and avoids gateway dependence)
      event.nft_metadata_uri = metadataIpfsUri || metadataUrl;
      await event.save();

      console.log('Generated event NFT assets:', { imageUrl, metadataUrl, metadataIpfsUri });
    }

    console.log('Creating mint for event:', event.name);

    // Create mint
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      0 // 0 decimals for NFT
    );

    console.log('Mint created:', mint.toBase58());

    // Create recipient token account
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient
    );

    console.log('ATA created:', ata.address.toBase58());

    // Mint 1 token to recipient
    await mintTo(
      connection,
      payer,
      mint,
      ata.address,
      payer.publicKey,
      1
    );

    console.log('Token minted to recipient');

    // Create metadata PDAs
    const encoder = new TextEncoder();
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        encoder.encode('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const [editionPda] = PublicKey.findProgramAddressSync(
      [
        encoder.encode('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        encoder.encode('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    // Metaplex token-metadata limits (bytes): name<=32, symbol<=10, uri<=200
    const clampUtf8Bytes = (value, maxBytes) => {
      const str = String(value ?? '');
      if (Buffer.byteLength(str, 'utf8') <= maxBytes) return str;
      let out = '';
      for (const ch of str) {
        const next = out + ch;
        if (Buffer.byteLength(next, 'utf8') > maxBytes) break;
        out = next;
      }
      return out;
    };

    const metadataName = clampUtf8Bytes(`${event.name} - Attendance`, 32);
    const metadataSymbol = clampUtf8Bytes('ATTEND', 10);
    const metadataUri = clampUtf8Bytes(event.nft_metadata_uri || '', 200);

    // Build metadata transaction
    const tx = new Transaction();

    // Add metadata instruction
    tx.add(
      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPda,
          mint: mint,
          mintAuthority: payer.publicKey,
          payer: payer.publicKey,
          updateAuthority: payer.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: metadataName,
              symbol: metadataSymbol,
              uri: metadataUri,
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

    // Add master edition instruction
    tx.add(
      createCreateMasterEditionV3Instruction(
        {
          edition: editionPda,
          mint: mint,
          updateAuthority: payer.publicKey,
          mintAuthority: payer.publicKey,
          payer: payer.publicKey,
          metadata: metadataPda,
        },
        {
          createMasterEditionArgs: {
            maxSupply: 0, // Unique NFT
          },
        }
      )
    );

    // Send metadata transaction
    const metadataSig = await sendAndConfirmTransaction(
      connection,
      tx,
      [payer],
      { commitment: 'confirmed' }
    );

    console.log('Metadata created:', metadataSig);

    // After master edition creation, the mint authority is often moved away from the payer
    // (e.g. to the Master Edition PDA). Only try to revoke authority if payer is still the authority.
    const mintInfo = await getMint(connection, mint, 'confirmed');

    const revokeIxs = [];

    if (mintInfo.mintAuthority && mintInfo.mintAuthority.equals(payer.publicKey)) {
      revokeIxs.push(
        createSetAuthorityInstruction(
          mint,
          payer.publicKey,
          AuthorityType.MintTokens,
          null
        )
      );
    } else {
      console.log(
        'Skipping MintTokens revoke; current mint authority is',
        mintInfo.mintAuthority ? mintInfo.mintAuthority.toBase58() : '(null)'
      );
    }

    if (mintInfo.freezeAuthority && mintInfo.freezeAuthority.equals(payer.publicKey)) {
      revokeIxs.push(
        createSetAuthorityInstruction(
          mint,
          payer.publicKey,
          AuthorityType.FreezeAccount,
          null
        )
      );
    }

    if (revokeIxs.length > 0) {
      const revokeTx = new Transaction();
      revokeTx.add(...revokeIxs);

      await sendAndConfirmTransaction(connection, revokeTx, [payer], {
        commitment: 'confirmed',
      });

      console.log('Mint authorities revoked:', revokeIxs.length);
    }

    // Update claim with success
    claim.status = 'completed';
    claim.mint_address = mint.toBase58();
    claim.signature = metadataSig;
    await claim.save();

    res.json({
      success: true,
      mintAddress: mint.toBase58(),
      signature: metadataSig,
      message: 'NFT minted successfully!',
    });

  } catch (error) {
    console.error('Mint error:', error);

    if (error instanceof SendTransactionError) {
      try {
        const logs = await error.getLogs();
        if (logs?.length) {
          console.error('On-chain logs (SendTransactionError):', logs);
        }
      } catch (logErr) {
        console.error('Failed to fetch SendTransactionError logs:', logErr);
      }
    }

    // Update claim status to failed
    if (claimId) {
      try {
        const claim = await Claim.findById(claimId);
        if (claim) {
          claim.status = 'failed';
          await claim.save();
        }
      } catch (err) {
        console.error('Failed to update claim status:', err);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mint NFT',
    });
  }
});

export default router;
