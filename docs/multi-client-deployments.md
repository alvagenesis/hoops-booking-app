# Multi-Client Deployments

This app is intended to run as one deployed instance per client while sharing the same codebase.

## Current Instances

| Client | `VITE_CLIENT_KEY` | Database | Notes |
| --- | --- | --- | --- |
| YMCA Manila | `ymca` | Current Supabase project | This local workspace is configured as the YMCA instance. |
| RACE Court | `race-court` | Separate Supabase project | Create a new Supabase project and run `supabase-schema.sql`. |
| AG Court | `ag-court` | Separate Supabase project | Create a new Supabase project and run `supabase-schema.sql`. |

## Per-Client Setup

For each client:

1. Create a new Supabase project.
2. Run `supabase-schema.sql` in that project's SQL editor.
3. Configure storage buckets and auth providers for that project.
4. Create a separate Vercel project or deployment target from this same repository.
5. Set that deployment's environment variables using `.env.example` as the template.
6. Upload the client's logo into `public/` and set `VITE_VENUE_LOGO` to its public path.

## Environment Variables

Branding:

```env
VITE_CLIENT_KEY=race-court
VITE_VENUE_NAME=RACE Court
VITE_VENUE_LOGO=/race-court-logo.png
VITE_LOGIN_BACKGROUND_IMAGE=/ymca-bg.png
VITE_CONTACT_PHONE=09XX-XXX-XXXX
```

Supabase:

```env
VITE_SUPABASE_URL=https://your-client-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-client-anon-key
```

Payments:

```env
VITE_GCASH_NUMBER=09XX-XXX-XXXX
VITE_GCASH_ACCOUNT_NAME=RACE Court
VITE_MAYA_NUMBER=09XX-XXX-XXXX
VITE_MAYA_ACCOUNT_NAME=RACE Court
VITE_BANK_NAME=BDO
VITE_BANK_ACCOUNT_NUMBER=XXXX-XXXX-XXXX
VITE_BANK_ACCOUNT_NAME=RACE Court
```

## Why Separate Supabase Projects

The current schema is single-client by design. Tables such as `profiles`, `courts`, `reservations`, `time_slot_configs`, and `amenities` do not have a `venue_id`, and admin access is scoped to the whole database. Separate Supabase projects keep each client's users, bookings, courts, payments, and storage isolated without a large multi-tenant migration.
