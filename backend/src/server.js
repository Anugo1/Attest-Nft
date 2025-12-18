import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import eventsRouter from './routes/events.js';
import claimsRouter from './routes/claims.js';
import mintRouter from './routes/mint.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
const normalizeOrigin = (value) => value.replace(/\/+$/, '');

const allowedOrigins = (process.env.FRONTEND_URL || 'https://attest-nft.vercel.app')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalized)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`));
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/events', eventsRouter);
app.use('/api/claims', claimsRouter);
app.use('/api/mint', mintRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
