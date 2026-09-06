# Kaki Finder · Kampung Connect

A community application connecting generations through shared activities at Pek Kio Community Centre.

## Current status

The core guest demo works: a warm landing form, English request parsing, editable
interpretation, intergenerational matching, suggested facility/time slots, and interest
recording. It includes 15 fictional residents, five illustrative facilities, and fixture
or Supabase storage. The live Supabase schema, seed, access restrictions, and duplicate
interest protection have been verified. This local project uses DATA_SOURCE=supabase.
Accounts, messaging, actual facility bookings, and OpenAI calls are not implemented.

## Run locally

Requires Node.js 22.17+ and npm. From this project folder:

```sh
npm install
npm run dev
```

Open the localhost URL printed by Next.js. No API keys are required in fixture mode.

The starter uses TypeScript 6 because the installed Next.js ESLint tooling does not
yet support TypeScript 7. The compiler targets ES2022 and Tailwind uses its v4 PostCSS plugin.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Structure

```text
src/
  app/
    page.tsx                 Landing page and request form
    results/page.tsx         Match cards, suggestions, and interest flow
    api/
      parse/route.ts         English keyword interpretation
      matches/route.ts       Validated matching and scheduling
      interests/route.ts     Validated, idempotent interest recording
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
    auth/                    Email accounts, profiles, and private interests
  data/                      Validated resident and facility JSON fixtures
  lib/
    api/                     Response helpers
    repositories/            Fixture and Supabase storage adapters
    supabase/                Server-only client factory
    constants.ts             Labels, timezone, examples
    validation/              Runtime validation for data and interests
  types/domain.ts            Resident, request, facility, match types
supabase/
  setup.sql                  Complete script to run in Supabase SQL Editor
  migrations/                Versioned SQL schema with RLS and grants
  seeds/                     Generated, repeatable fixture seed
scripts/                     SQL preparation and live connection verification
tests/                       Parser, matching, schedule, and database checks
```

## Decisions

- Age and role are independent. Role belongs to each activity: a senior can learn coding while a young adult teaches.
- Groups: 20–40, 41–64, 65+, and family with kids. Children participate through a parent.
- English UI/parser; English, Mandarin, Tamil, Malay, and Hokkien matching preferences.
- Fixture reads run without keys; Supabase stays optional. Failed database writes never silently fall back. Fixture interests are saved in browser local storage.
- Facility slots are labelled demo suggestions, never reservations.
- Interest recording sends no messages. Supabase accounts are optional; guest matching remains available.

## Optional Supabase

1. Copy .env.example to .env.local and populate the server URL/secret and public URL/publishable key. Both URLs must identify the same project. Keep DATA_SOURCE=fixtures during setup.
2. Run `npm run db:prepare` if fixtures or the migration have changed. This regenerates `supabase/setup.sql` and `supabase/seeds/demo.sql` from the JSON source data.
3. Open your Supabase project, choose **SQL Editor → New query**, paste all of `supabase/setup.sql`, and run it. The script creates the directory, facilities, profiles, and interests; applies ownership/publication rules; and seeds 15 demo residents and five facilities. Rerunning preserves existing interests.
4. Run `npm run db:check` for read/seed/access-policy verification. `SCHEMA_MISSING` means step 3 is still needed.
5. Run `npm run db:verify` to also insert one synthetic interest, retry it to check duplicate protection, and remove only that temporary row.
6. After verification succeeds, set DATA_SOURCE=supabase and restart the development server. Matching and interest routes use `createCommunityRepository()` to select the adapter.

The secret API key authorizes data operations but is not a database migration credential;
run the schema through the SQL Editor. No key or real resident information is embedded in SQL.
Anonymous clients cannot access the tables. Authenticated clients can access only their
own profiles and interests through ownership policies; the demo directory stays server-only.
Never expose the secret key or use the privileged client as a signed-in user session.

## Vercel

Import this repository as Next.js, select Node.js 22.x or a compatible newer runtime,
and use the default next build configuration. Add Supabase environment variables only
for Supabase mode. Set DATA_SOURCE=supabase and the same Supabase environment values
in Vercel; keep the secret server-only. Set APP_URL to the deployed HTTPS origin for auth emails.

## Guest workflow and API

1. Enter a name, block, participant group, and request. The four example buttons populate sample requests.
2. Review the parsed activity, role, skill, language, generation preference, and weekly availability. Unknown or ambiguous details require confirmation.
3. Show up to three compatible kakis. Cross-generation scores rank first, followed by confirmed shared time, exact skill, and stable ID. Unavailable times remain labelled "Time to arrange".
4. Express interest. The API checks compatibility and the proposed slot again; Supabase retries use a stable request ID. Fixture mode explicitly requires a successful browser-local save.

POST /api/parse accepts `{ text }` and returns ParsedRequest. POST /api/matches accepts
a confirmed MatchRequest and returns `{ matches, storageMode, ownerId }`. POST /api/interests
accepts InterestDraft plus `expectedAccountId` (null for guests) and returns a bounded recording status, storage mode, and optional
record ID. There is no public interest-listing endpoint.

The current search lives in sessionStorage; saved-choice receipts live in localStorage.
Names and request text never appear in URLs. Demo choices do not send messages or book venues.

## Parser and scheduling limits

This is an English keyword parser, not an LLM. It recognises the supported activities,
common learning/teaching phrases, named weekdays, weekday/weekend groups, broad periods,
and common time ranges. Unrecognised activities, multiple activities, relative dates,
and ambiguous availability are reviewed in the form. It does not interpret arbitrary
prose or translate requests. A Hokkien cooking request is a skill preference, not an
assumed spoken-language preference.

Availability uses recurring Singapore weekdays. Morning means 09:00–12:00, afternoon
12:00–18:00, evening 18:00–21:00. The scheduler finds the earliest shared 60-minute window
within the next 14 Singapore calendar days. Omitted availability permits a proposal
that requires confirmation. All venue inventory and times are illustrative.

## Accounts

Email sign-up/sign-in, confirmation, sign-out, password recovery/change, private profiles,
and My interests are implemented. Parents manage family accounts. Saved profiles prefill
new requests. Residents can opt in to matching after adding an introduction, activity
roles, and weekly availability; existing accounts remain private by default.

For an existing database, run `supabase/migrations/202609050002_accounts.sql` in the
Supabase SQL Editor. New databases can run the full `supabase/setup.sql`. Set APP_URL
and configure the callback URLs in Supabase Authentication before testing email links.
See `src/features/auth/README.md` for the exact URL setup, security design and test steps.

## Discoverable neighbours

For an existing account database, run `supabase/migrations/202609050003_discovery.sql`
and deploy this version before inviting anyone to publish a profile. The complete
`supabase/setup.sql` includes all migrations in order for new projects.

In My account, add an activity, choose Share/teach, Learn, or Do together for that
activity, and add weekly Singapore-time availability. To publish, write a short bio,
select **Make my profile discoverable**, and save. The form explains which fields will
appear publicly; email and auth IDs are never included in matching cards. Family profiles
use the adult's details. Opt out by unchecking and saving.

Matches combine active, opted-in neighbours with labelled demo profiles. Generation
bridge score ranks first, then registered neighbours, shared time, and skill fit. The
signed-in account ID prevents self-matches even if the request uses a different name.
Hiding a profile prevents new matches and interest saves; existing interest rows remain
but their target is labelled unavailable. No messages or facility bookings are sent.

Private profile updates are projected into the server-only directory by a database
trigger only after consent. Public directory IDs are separate from auth IDs and cannot
be chosen by clients. The profile owner can update their activities or hide the card;
other accounts cannot publish, edit, or hide someone else's profile. Account deletion
hides its directory row while preserving other residents' saved selections.

## Connection requests

Real neighbour cards offer **Send connection request** to signed-in residents.
Recipients accept or decline under **My account → My connections → Received**;
senders track status under **Sent**. Pending requests can be withdrawn by the
sender, and either participant can cancel an accepted connection. The inbox
refreshes on browser focus and through its Refresh requests button.

Apply `supabase/migrations/202609060004_connections.sql` before deploying this
version. Existing interests are not converted into requests. Demo cards retain
the private interest-save flow. Email and block numbers are not shared with the
recipient. Accepting expresses willingness to connect, not a facility reservation
or an agreed meetup time. No emails or external notifications are sent.

See `supabase/connections-guide.md` for deployment, the two-account demo, and privacy
rules. `npm run test:connections` verifies the live flow using three temporary
confirmed accounts and removes those accounts and requests afterward.

## Verification

The automated suite includes 21 tests. Tests cover the
four requests, independent age/role, explicit preferences, generation ranking, Singapore
date boundaries, no shared slot, forged slots, repeatable SQL, public access denial,
foreign keys, duplicate interest protection, account ownership isolation, publication,
hiding, immutable public IDs, retained history, deletion, and the connection request
state machine with participant-only access and idempotent transitions.

`npm run test:auth` verifies live sign-in/out and cookie sessions using temporary confirmed
accounts without sending email. After the account SQL is applied it also verifies profile
storage, interest history, ownership, retries, publication, real matching, hiding, and
removal. It deletes its temporary users and unreferenced synthetic directory rows.

`npm run test:http` targets a local app at http://127.0.0.1:3100 by default. Set
KAKI_TEST_ORIGIN to another local URL if needed. It verifies page routes and the complete
parse → match → interest API flow, invalid inputs, empty results, invalid slots, and retries.
In Supabase mode it creates one uniquely identified synthetic interest and removes it in
cleanup; it requires the server key for that cleanup. Both Supabase and fixture HTTP
flows have passed. No automated browser interaction/visual QA has been performed.
