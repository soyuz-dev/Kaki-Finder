# Data and database tests

Run `npm test`. community-data.test.ts covers the fixture mix, age/role independence, immutable reads, mode validation, data mapping, input constraints, and duplicate selection conflicts. database.test.ts runs the real setup SQL in embedded PostgreSQL to verify repeatable seeding, access restrictions, foreign keys, duplicate protection, and preservation of interests.

`npm run db:check` verifies the live project's schema/seed and public access restrictions. `npm run db:verify` additionally tests an interest write/retry and removes its own temporary row. Neither command logs keys or private records.

matching-flow.test.ts covers the four example requests, role direction, explicit preferences, cross-generation ranking, ambiguous inputs, Singapore date boundaries, missing/conflicting availability, and invalid slots.

`npm run test:http` verifies local page routes and parsing, matching, and interest APIs in either storage mode. It cleans up its uniquely identified Supabase test record. Set KAKI_TEST_ORIGIN when the local server uses a port other than 3100. Client-side interaction and visual QA are not automated here.
