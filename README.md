# KennelCheck React Rewrite

A clean React + Vite + Supabase rewrite for small rescue quarantine kennel workflows.

## Features

- Dashboard from live Supabase data
- Quarantine kennel list
- Add/edit/remove cats from quarantine
- Per-cat photo upload using Supabase Storage
- Notes
- Symptom toggles
- Meds due view
- Light/dark mode
- Mock Shelterluv-style database and sync function

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Add your Supabase URL and publishable key to `.env`.

## Supabase

Run this first if you have an old function:

```sql
drop function if exists sync_from_mock_shelterluv();
```

Then run:

```text
supabase_complete_setup.sql
```

in Supabase SQL Editor.
