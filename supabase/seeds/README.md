# Seed data

demo.sql is generated from src/data/*.json by `npm run db:prepare`. Stable IDs make reseeding repeatable without duplicate profiles. It updates only the known fictional profile/facility IDs and never deletes interests or creates accounts. Run supabase/setup.sql for the complete initial setup.
