# Attest Backend - Node.js + MongoDB

Node.js backend for Attest NFT minting system, replacing Supabase Edge Functions.

## Tech Stack

- **Node.js** + **Express** - REST API server
- **MongoDB** + **Mongoose** - Database
- **@solana/web3.js** - Solana blockchain integration
- **@metaplex-foundation/mpl-token-metadata** - NFT metadata standard

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Install MongoDB

**Windows (using Chocolatey):**
```powershell
choco install mongodb
```

**Or download from:** https://www.mongodb.com/try/download/community

### 3. Start MongoDB

```bash
mongod --dbpath C:\data\db
```

(Create the directory first if it doesn't exist)

### 4. Configure Environment

Create `.env` file in `backend/` directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/attest

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PAYER_SECRET_KEY=5AmFsuw3ay7U3Tp4d2ACNxvpZeVQZoiTXCVDR3PGBLjjydpKRqYr5oSWNWMCmRtrn2A4i8H3nBB5BpDkd1AT8TRu

# Server
PORT=5000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:8080
```

**Important:** Replace `SOLANA_PAYER_SECRET_KEY` with your actual base58-encoded secret key.

### 5. Fund Payer Wallet (Devnet)

Your payer address: `DEgZzFwGj9Kpi8U44amu8KDkNW8oZZd2Y7iXadimvUtb`

Get devnet SOL from: https://faucet.solana.com/

### 6. Start Backend Server

```bash
npm run dev
```

Server will run on `http://localhost:5000`

## API Endpoints

### Events
- `GET /api/events` - Get all active events
- `GET /api/events/:id` - Get event by ID
- `GET /api/events/code/:code` - Get event by claim code
- `POST /api/events` - Create new event

### Claims
- `POST /api/claims` - Create new claim
- `GET /api/claims/count/:eventId` - Get claim count for event
- `GET /api/claims/check/:eventId/:walletAddress` - Check if wallet claimed

### Minting
- `POST /api/mint` - Mint NFT for claim

## Frontend Configuration

Update frontend `.env` or `.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Production Deployment

### MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Update `MONGODB_URI` in production env

### Hosting Options

- **Render** - Easy Node.js deployment
- **Railway** - Simple deployment with MongoDB addon
- **Heroku** - Classic PaaS
- **DigitalOcean App Platform** - Managed containers

### Environment Variables (Production)

Set these in your hosting platform:
- `MONGODB_URI`
- `SOLANA_RPC_URL` (use mainnet for production)
- `SOLANA_PAYER_SECRET_KEY`
- `FRONTEND_URL`
- `NODE_ENV=production`

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod --dbpath C:\data\db`
- Check `MONGODB_URI` in `.env`

### Solana Mint Fails
- Verify payer wallet has SOL (devnet or mainnet)
- Check `SOLANA_PAYER_SECRET_KEY` is valid base58
- Confirm `SOLANA_RPC_URL` is accessible

### CORS Errors
- Update `FRONTEND_URL` in `.env` to match your frontend URL
- Ensure frontend is using correct `VITE_API_URL`

## Migration from Supabase

The backend now handles:
- ✅ Event storage (MongoDB instead of Supabase Postgres)
- ✅ Claim tracking (MongoDB)
- ✅ NFT minting (Node.js instead of Deno Edge Functions)
- ✅ No more Deno/ESM import issues
- ✅ Standard Node.js + npm ecosystem

Frontend changes:
- ✅ Updated `src/lib/api-adapter.ts` to use REST API
- ✅ Updated `src/components/ClaimNFT.tsx` to call Node.js backend
- ✅ Removed Supabase client dependencies
