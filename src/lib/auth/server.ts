import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { HttpError } from '@/lib/api/http';

export function accountsEnabled() {
  return process.env.DATA_SOURCE === 'supabase' && !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

export function appOrigin() {
  // Email links must use configured infrastructure, never a caller's Host header.
  const value = process.env.APP_URL || (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:3100' : undefined);
  if (!value) throw new HttpError(503, 'APP_URL_MISSING', 'Email links are not configured yet. Please contact the demo organiser.');
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Invalid APP_URL');
  return url.origin;
}

/** Called only by Route Handlers: they can persist refresh cookies. Keeping all
 * auth access here means tokens never enter browser JS or Server Components. */
export async function authClient() {
  if (!accountsEnabled()) throw new HttpError(503, 'ACCOUNTS_DISABLED', 'Accounts are not configured yet. You can still find a kaki as a guest.');
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => { values.forEach(({ name, value, options }) => jar.set(name, value, options)); },
    },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(15_000) }) },
  });
}

export async function identity(required = false) {
  if (!accountsEnabled()) {
    if (required) throw new HttpError(503, 'ACCOUNTS_DISABLED', 'Accounts are not configured yet.');
    return null;
  }
  const client = await authClient();
  // getUser verifies the session with Supabase; cookie contents alone are not identity.
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') {
    if (error.status === 400 || error.status === 401 || error.status === 403) throw new HttpError(401, 'SESSION_EXPIRED', 'Your session expired. Please sign in again.');
    throw new HttpError(503, 'AUTH_UNAVAILABLE', 'We cannot check your account right now. Please try again.');
  }
  if (!data.user) {
    if (required) throw new HttpError(401, 'SIGN_IN_REQUIRED', 'Please sign in to manage your account.');
    return null;
  }
  return { client, user: data.user };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  // Next's internal URL may use localhost even when the browser uses 127.0.0.1.
  // Host is browser-controlled infrastructure, not a form-supplied redirect URL.
  const target = new URL(request.url);
  const host = request.headers.get('host');
  if (host) target.host = host;
  if ((origin && origin !== target.origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'CROSS_SITE', 'Please submit this request from Kaki Finder.');
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON_REQUIRED', 'Please send a JSON request.');
}

export function accountDatabaseError(code?: string) {
  throw new HttpError(503, 'ACCOUNT_DATABASE', ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code || '')
    ? 'Account storage is not ready yet. The organiser needs to run the account setup SQL.'
    : 'We could not save or load your account details. Please try again.');
}
