# Database migrations

202609050001_community_data.sql creates the residents, facilities, and interests tables. Availability/intent arrays use JSON validated by the application. RLS is enabled and public table privileges revoked; trusted server code uses the service role. Add account ownership policies in a later migration. Run the generated supabase/setup.sql to apply schema and seed together.
