'use client';
import { z } from 'zod';
import { SEARCH_STORAGE_KEY } from '@/lib/constants';

export const sessionSchema = z.object({ enabled: z.boolean(), user: z.object({ id: z.uuid(), email: z.string().optional() }).nullable() });
export async function accountRequest<T>(url: string, schema: z.ZodType<T>, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(url, { method, cache: 'no-store', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Please try again.');
  return schema.parse(data);
}
export function clearSearchDraft() {
  try { sessionStorage.removeItem(SEARCH_STORAGE_KEY); } catch { /* Auth works even if optional draft storage is blocked. */ }
}
export function redirectAfterAuth(path: '/account' | '/account/sign-in') {
  // A full navigation discards mounted profile/results state from the previous identity.
  clearSearchDraft();
  window.location.assign(path);
}
