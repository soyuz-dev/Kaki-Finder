import { RepositoryError } from './errors';

export function getDataSource(value: string | undefined): 'fixtures' | 'supabase' {
  if (value === undefined || value === '' || value === 'fixtures') return 'fixtures';
  if (value === 'supabase') return 'supabase';
  throw new RepositoryError('INVALID_CONFIG', 'DATA_SOURCE must be fixtures or supabase.');
}
