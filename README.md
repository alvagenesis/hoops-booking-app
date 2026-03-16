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

2. Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```

3. Set up your Supabase project and run `supabase-schema.sql` in the SQL Editor.

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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run lint` | Run ESLint |
