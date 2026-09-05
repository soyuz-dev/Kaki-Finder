# Optional Supabase accounts

Email sign-up, confirmation, sign-in, sign-out, password recovery/change, private resident
profiles, and My interests are implemented. Guest matching remains available.

Apply `supabase/migrations/202609050002_accounts.sql` to an existing guest database;
new databases use the complete `supabase/setup.sql`. Never rerun the original foundation
migration by itself after accounts are enabled: use the complete setup so account grants
are restored last. Both complete setup and the account migration are repeatable.

Set `APP_URL` to the exact site origin (local: `http://127.0.0.1:3100`; Vercel: your HTTPS
domain). In Supabase Authentication > URL Configuration, use the deployed origin as the
Site URL and allow these exact redirect URLs for each origin you use:

- `/auth/callback`
- `/auth/callback?next=password`

Keep the default confirmation/recovery templates containing `{{ .ConfirmationURL }}`.
The app uses PKCE code exchange, so open an email link in the browser that requested it.
Email confirmation should remain enabled. A parent's email manages a family account.
Supabase email delivery settings must be configured for the addresses used in your demo.

## Session boundary

All auth and private data operations run in Route Handlers with a publishable-key,
cookie-aware Supabase client. They verify identity with `getUser` and write refresh
cookies into the response. The UI loads private data via uncached APIs; Server Components
never handle sessions, so no refresh Proxy is needed for this architecture. If private
data later moves into Server Components, add the Supabase refresh Proxy at that point.
Cookies are HttpOnly, SameSite=Lax and Secure in production. Email links use APP_URL;
callbacks only redirect to fixed account paths. Cross-site mutations are rejected.

Profiles and signed-in interests use owner-only RLS. The privileged directory client
still reads demo residents/facilities and records unowned guest interests. Existing
guest records are never claimed based on names, blocks, or local receipts. Match results
carry the account ID and interest writes reject changed identities before saving.
Local receipts are scoped to the account, and auth transitions discard search drafts.

Profiles start private. With the discovery migration applied, adults may explicitly
publish their name, block, participant group, languages, bio, activity intents, and
availability. Email and auth IDs are never published. A trigger copies consented fields
to an active directory row with a separate public ID. Hiding deactivates that row; the
matcher excludes it and new interest inserts are rejected at the database boundary.
My interests shows the latest 100 selections and supports removing an owned selection.
Neither interest action sends a message or reserves a venue. Signup/recovery emails are
sent only when the resident submits the corresponding form.

## Verification

`npm test` exercises real Postgres RLS with two users via PGlite, forged ownership,
private guest rows, deletion, and repeatable setup. `npm run test:auth` targets a local
app (default port 3100). It creates two temporary, confirmed Supabase Auth users without
sending email, checks sessions/cookies and account APIs, and deletes its users afterward.
Before the migration, it reports profile/interest checks as deferred; rerun after SQL
setup for the full live flow. Real confirmation/reset email delivery needs manual testing
with the project's configured email provider.

Discovery setup: run `supabase/migrations/202609050003_discovery.sql`, then deploy the new
code before using publication. The latest full `supabase/setup.sql` applies all migrations
in order. Never apply an older migration by itself after discovery is enabled, since the
latest migration restricts writes to the generated public ID. `npm run test:auth` also
checks publication, private defaults, self-match exclusion, hiding, and republishing.
