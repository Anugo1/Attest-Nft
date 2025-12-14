# Attest

Attest is a Solana-based **proof-of-attendance** app. Event organizers create events and share a claim code / QR, and attendees connect a wallet to claim an **Attest NFT**.

## Features

- **Create events** with a shareable claim code
- **QR-based claiming** for fast check-in flows
- **Wallet-first UX** (Phantom / Solana wallets)
- **Mint attendance NFTs** via a backend minting endpoint

## Tech Stack

- **Frontend:** Vite + React + TypeScript
- **UI:** TailwindCSS + shadcn/ui + Radix UI
- **Data/Auth/Backend:** Supabase (Postgres + Edge Functions)
- **Chain:** Solana (`@solana/web3.js`)

## Project Structure (high level)

- `src/` – React app
- `src/integrations/supabase/` – Supabase client wiring
- `supabase/migrations/` – Database schema (events/claims)
- `supabase/functions/` – Edge functions (e.g. NFT minting)

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project (URL + anon key)

### Install

```sh
npm install
```

### Configure Environment Variables

Create a `.env.local` file in the repo root:

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-supabase-anon-key>"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

Notes:

- Vite only exposes variables prefixed with `VITE_` to the browser.
- Keep secrets out of the frontend. Do **not** put service-role keys in `.env.local`.

### Run Dev Server

```sh
npm run dev
```

The Vite dev server is configured to run on port **8080**.

### Build

```sh
npm run build
npm run preview
```

## Supabase Setup (Database + Function)

### Database

This project expects two core tables:

- `events` – event details + `claim_code`
- `claims` – per-wallet claim records + mint status

Schema is provided in `supabase/migrations/`.

### Minting Endpoint

The claim flow triggers a backend minting endpoint (Supabase Edge Function) to mint an Attest NFT and update claim status.

At minimum, you will typically configure:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Any chain/minting secrets (e.g. payer keys) must live in Supabase secrets (server-side), never in the frontend.

## App Flow

### Organizer

1. Connect wallet
2. Create event
3. Share claim code / QR

### Attendee

1. Open claim link / enter claim code
2. Connect wallet
3. Sign a message to prove wallet ownership
4. Mint Attest NFT (backend) and receive it in the wallet

## Troubleshooting

- **Blank events / errors fetching data:** confirm your `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Mint fails:** confirm the minting function is deployed and secrets are set server-side.


