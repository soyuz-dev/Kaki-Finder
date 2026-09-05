import type { z } from 'zod';

export async function postJson<T>(path: string, data: unknown, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result?.error?.message === 'string' ? result.error.message : 'Unable to complete your request. Please try again.');
  return schema.parse(result);
}
