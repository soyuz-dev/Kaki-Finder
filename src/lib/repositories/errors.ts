export class RepositoryError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export function databaseFailure(operation: string, code?: string): never {
  if (code === 'PGRST205' || code === '42P01') {
    throw new RepositoryError('SCHEMA_MISSING', 'Run supabase/setup.sql in your project SQL Editor first.');
  }
  // Raw SDK errors may contain request details. Expose a bounded message instead.
  throw new RepositoryError('DATABASE_ERROR', `Could not ${operation}. Retry after checking Supabase connectivity.`);
}
