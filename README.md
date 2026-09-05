# Kaki Finder · Kampung Connect

A community application connecting generations through shared activities at Pek Kio Community Centre.

## Current status

The project structure is ready: Next.js App Router, strict TypeScript, Tailwind CSS 4,
warm starter pages, domain contracts, API placeholders, and an optional server-only Supabase client.
Parsing, matching, fixtures, scheduling, interest persistence, and accounts are **not implemented yet**.
The three placeholder POST endpoints return HTTP 501.

## Run locally

Requires Node.js 22.17+ and npm. From this project folder:

```sh
npm install
npm run dev
```

Open the localhost URL printed by Next.js. No API keys are required.

The starter uses TypeScript 6 because the installed Next.js ESLint tooling does not
yet support TypeScript 7. The compiler targets ES2022 and Tailwind uses its v4 PostCSS plugin.

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

## Structure

```text
src/
  app/
    page.tsx                 Warm landing page starter
    results/page.tsx         Results shell
    api/
      parse/route.ts         Parsing placeholder
      matches/route.ts       Matching placeholder
      interests/route.ts     Interest placeholder
    layout.tsx               Metadata and layout
    globals.css              Tailwind 4 theme
  components/
    layout/                  Shared header
    ui/                      Reusable visual components
  features/
    parser/                  Natural-language interpretation
    matching/                Compatibility and generation bridge ranking
    scheduling/              Singapore-time facility suggestions
    interests/               Express Interest flow
    auth/                    Optional future accounts
  data/                      Future resident and facility fixtures
  lib/
    api/                     Response helpers
    repositories/            Storage-independent contracts
    supabase/                Server-only client factory
    constants.ts             Labels, timezone, examples
  types/domain.ts            Resident, request, facility, match types
supabase/
  migrations/                Future SQL schema
  seeds/                     Future repeatable fixtures
tests/                       Planned behavior coverage
```

## Decisions

- Age and role are independent. Role belongs to each activity: a senior can learn coding while a young adult teaches.
- Groups: 20–40, 41–64, 65+, and family with kids. Children participate through a parent.
- English UI/parser; English, Mandarin, Tamil, Malay, and Hokkien matching preferences.
- Fixture mode will run without keys; Supabase stays optional. Failed database writes must not silently fall back.
- Facility slots are labelled demo suggestions, never reservations.
- Interest recording sends no messages. Accounts are a stretch goal after the guest demo works.

## Optional Supabase

Copy .env.example to .env.local when integrating. Set SUPABASE_URL and SUPABASE_SECRET_KEY
in the server environment only. The client factory returns null when either is missing;
it does not connect automatically, create tables, or implement storage.

DATA_SOURCE=fixtures is reserved for future adapters. Switch to supabase after the schema,
seed, and adapter exist. Future Auth uses the separate public URL/publishable key and
cookie-aware user clients with ownership-based RLS. Never expose secret keys to the browser
or use the privileged client as a signed-in user session.

## Vercel

Import this repository as Next.js, select Node.js 22.x or a compatible newer runtime,
and use the default next build configuration. Add Supabase environment variables only
when the integration is ready. No deployment was created during scaffold setup.

## Next steps

1. Populate 15 fictional residents and demo facility schedules.
2. Implement parsing and editable request confirmation.
3. Implement matching, bridge badges, and suggested slots.
4. Connect results and interest recording, then Supabase storage.
5. Verify the guest demo before adding Supabase Auth accounts.

## Scaffold verification

Verified during setup: lint, TypeScript checking, and the production build pass.
Local HTTP checks returned 200 for / and /results, and the expected 501 for each
placeholder POST endpoint. Supabase connectivity and feature behavior are not yet tested.
