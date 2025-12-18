import express from 'express';
import Claim from '../models/Claim.js';

const router = express.Router();

// Create new claim (idempotent per event_id + wallet_address)
router.post('/', async (req, res) => {
  try {
    const { event_id, wallet_address, signature, status } = req.body || {};

    if (!event_id || !wallet_address) {
      return res.status(400).json({ error: 'event_id and wallet_address are required' });
    }

    // If a claim already exists for this wallet/event, return it instead of erroring.
    const existing = await Claim.findOne({ event_id, wallet_address });
    if (existing) {
      return res.status(200).json(existing);
    }

    const claim = new Claim({
      event_id,
      wallet_address,
      signature,
      status: status || 'pending',
    });

    await claim.save();
    res.status(201).json(claim);
  } catch (error) {
    // Handle unique index race (event_id + wallet_address)
    if (error && typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      try {
        const { event_id, wallet_address } = req.body || {};
        const existing = await Claim.findOne({ event_id, wallet_address });
        if (existing) return res.status(200).json(existing);
      } catch {
        // fall through
      }
    }

    res.status(400).json({ error: error?.message || 'Failed to create claim' });
  }
});

// Get claim count for an event
router.get('/count/:eventId', async (req, res) => {
  try {
    const count = await Claim.countDocuments({
      event_id: req.params.eventId,
      status: 'completed',
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if wallet has claimed for event
router.get('/check/:eventId/:walletAddress', async (req, res) => {
  try {
    const claim = await Claim.findOne({
      event_id: req.params.eventId,
      wallet_address: req.params.walletAddress,
    });
    res.json(claim);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
