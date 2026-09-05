import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createFixtureRepository } from './fixtures';
import { createSupabaseRepository } from './supabase';
import { getDataSource } from './config';
import { RepositoryError } from './errors';

export function createCommunityRepository() {
  if (getDataSource(process.env.DATA_SOURCE) === 'fixtures') return createFixtureRepository();
  const client = createSupabaseServerClient();
  if (!client) throw new RepositoryError('MISSING_CONFIG', 'Set SUPABASE_URL and SUPABASE_SECRET_KEY for Supabase mode.');
  // Never silently switch to fixtures when a configured database is unavailable.
  return createSupabaseRepository(client);
}
