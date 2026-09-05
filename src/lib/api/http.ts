import { NextResponse } from 'next/server';
import { z } from 'zod';
import { RepositoryError } from '@/lib/repositories/errors';

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export async function readInput<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (Number(request.headers.get('content-length')) > 12_000) throw new HttpError(413, 'TOO_LARGE', 'Please shorten your request.');
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 12_000) throw new HttpError(413, 'TOO_LARGE', 'Please shorten your request.');
  return schema.parse(JSON.parse(text));
}
export function jsonResponse(value: unknown) {
  return NextResponse.json(value, { headers: { 'Cache-Control': 'no-store' } });
}
export function apiError(error: unknown) {
  let status = 500, code = 'SERVER_ERROR', message = 'Something went wrong. Please try again.';
  if (error instanceof HttpError) ({ status, code, message } = error);
  else if (error instanceof z.ZodError) { status = 400; code = 'INVALID_INPUT'; message = error.issues[0]?.message || 'Please check your details.'; }
  else if (error instanceof SyntaxError) { status = 400; code = 'INVALID_JSON'; message = 'Please send a valid request.'; }
  else if (error instanceof RepositoryError) {
    status = error.code === 'IDEMPOTENCY_CONFLICT' ? 409 : 503; code = error.code;
    message = error.code === 'IDEMPOTENCY_CONFLICT' ? error.message : 'We cannot reach the community directory right now. Please try again shortly.';
  }
  return NextResponse.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });
}
