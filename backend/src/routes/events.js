import express from 'express';
import Event from '../models/Event.js';

const router = express.Router();

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

// Get all active events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ is_active: true })
      .sort({ event_date: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get event by claim code
router.get('/code/:code', async (req, res) => {
  try {
    const event = await Event.findOne({
      claim_code: req.params.code.toUpperCase(),
      is_active: true,
    });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid event id' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create event
router.post('/', async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
