# HoopsHQ — Court Booking System

A basketball court booking management system with AI-powered smart booking, built with React, Vite, Supabase, and the Gemini API.

## Features

- **Dashboard** — Stats, AI-powered business insights, and recent activity
- **Calendar** — Interactive monthly calendar with date-range booking
- **Smart Booking** — Natural language booking powered by Google Gemini AI
- **Payment** — Full/partial payment flow with GCash, Maya, and Stripe options
- **Members** — Member list with role management
- **Auth** — Email/password, Google, and Facebook OAuth login

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React
- **Backend**: Supabase (Authentication + PostgreSQL)
- **AI**: Google Gemini API (2.5 Flash)
- **Testing**: Vitest + React Testing Library

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the client-specific values:
   ```bash
   cp .env.example .env
   ```

3. Set up the client's Supabase project and run `supabase-schema.sql` in the SQL Editor.
   This script also creates the required Storage buckets like `payment-proofs` and `avatars`.

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Your Supabase anonymous key |
| `VITE_GEMINI_API_KEY` | For AI features | Google Gemini API key |
| `VITE_CLIENT_KEY` | Recommended | Stable key for the deployed client instance |
| `VITE_VENUE_NAME` | Recommended | Venue/client name used in app branding |
| `VITE_VENUE_LOGO` | Recommended | Public logo path, for example `/ymca-logo.png` |
| `VITE_LOGIN_BACKGROUND_IMAGE` | Recommended | Public login background image path, for example `/ymca-bg.png` |
| `VITE_CONTACT_PHONE` | Recommended | Customer-facing contact number |
| `VITE_GCASH_NUMBER` | For payments | GCash number shown in payment instructions |
| `VITE_GCASH_ACCOUNT_NAME` | For payments | GCash account name shown in payment instructions |
| `VITE_MAYA_NUMBER` | For payments | Maya number shown in payment instructions |
| `VITE_MAYA_ACCOUNT_NAME` | For payments | Maya account name shown in payment instructions |
| `VITE_BANK_NAME` | For payments | Bank name shown in payment instructions |
| `VITE_BANK_ACCOUNT_NUMBER` | For payments | Bank account number shown in payment instructions |
| `VITE_BANK_ACCOUNT_NAME` | For payments | Bank account name shown in payment instructions |

## Multi-Client Deployments

Use one codebase with one deployment and one Supabase project per client. The current local `.env` is the YMCA instance. See `docs/multi-client-deployments.md` for the YMCA, RACE Court, and AG Court setup pattern.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run lint` | Run ESLint |
