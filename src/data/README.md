# Demo fixtures

residents.json contains 15 fictional profiles: five seniors aged 65+, five young professionals, four parent-managed families, and one adult equal partner. Roles belong to activity intents, independently of age. facilities.json contains five illustrative venues with weekly Singapore-time openings. No schedules represent real CC availability.

index.ts validates both files with shared Zod schemas. After changing JSON, run `npm run db:prepare` to regenerate the matching SQL seed. Stable IDs prevent reseeding duplicates.
