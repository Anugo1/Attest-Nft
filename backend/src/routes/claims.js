import express from 'express';
import Claim from '../models/Claim.js';

const router = express.Router();

// Create new claim
router.post('/', async (req, res) => {
  try {
    const claim = new Claim(req.body);
    await claim.save();
    res.status(201).json(claim);
  } catch (error) {
    res.status(400).json({ error: error.message });
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
