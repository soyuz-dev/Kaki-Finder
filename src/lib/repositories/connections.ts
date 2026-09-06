import { z } from 'zod';
import { connectionSchema } from '@/lib/validation/connections';
import { HttpError } from '@/lib/api/http';
export function mapConnection(value: unknown, userId: string) {
  const row = z.record(z.string(), z.unknown()).parse(value);
  if (row.sender_id !== userId && row.recipient_id !== userId) throw new HttpError(403, 'PRIVATE_REQUEST', 'This request is unavailable.');
  // Do not expose auth IDs, email, or the sender's full search preferences.
  return connectionSchema.parse({ id: row.id, direction: row.sender_id === userId ? 'outgoing' : 'incoming',
    senderName: row.sender_name, senderGroup: row.sender_group, recipientName: row.recipient_name,
    activity: row.activity, role: row.role, skill: row.skill, suggestedSlot: row.suggested_slot,
    status: row.status, createdAt: row.created_at, updatedAt: row.updated_at });
}
export function connectionFailure(code?: string): never {
  if (['42P01', '42703', 'PGRST202', 'PGRST204', 'PGRST205'].includes(code || '')) throw new HttpError(503, 'CONNECTION_SETUP', 'Connection requests are not ready yet. The organiser needs to run the connection setup SQL.');
  if (code === '23505') throw new HttpError(409, 'EXISTING_REQUEST', 'You already have a request for this activity, or this request ID was already used. Check My connections.');
  if (code === '42501') throw new HttpError(403, 'PRIVATE_REQUEST', 'You cannot perform that action on this request.');
  if (code === 'P0001' || code === '23514') throw new HttpError(409, 'REQUEST_CHANGED', 'This request or match has changed. Refresh your connections or matching results.');
  throw new HttpError(503, 'CONNECTION_UNAVAILABLE', 'We could not load or save this connection. Please try again.');
}
