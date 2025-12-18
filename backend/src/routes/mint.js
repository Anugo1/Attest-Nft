import express from 'express';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token';
import bs58 from 'bs58';
import mplTokenMetadataPkg from '@metaplex-foundation/mpl-token-metadata';
import Event from '../models/Event.js';
import Claim from '../models/Claim.js';

const mplTokenMetadata = mplTokenMetadataPkg?.default ?? mplTokenMetadataPkg;
const createCreateMetadataAccountV3Instruction = mplTokenMetadata.createCreateMetadataAccountV3Instruction;
const createCreateMasterEditionV3Instruction = mplTokenMetadata.createCreateMasterEditionV3Instruction;
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
        error: 'Claim not found' 
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
              name: `${event.name} - Attendance`,
              symbol: 'ATTEND',
              uri: event.nft_metadata_uri || '',
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

    // Revoke mint authority (make immutable)
    const revokeTx = new Transaction().add(
      createSetAuthorityInstruction(
        mint,
        payer.publicKey,
        AuthorityType.MintTokens,
        null
      )
    );

    await sendAndConfirmTransaction(
      connection,
      revokeTx,
      [payer],
      { commitment: 'confirmed' }
    );

    console.log('Mint authority revoked');

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
