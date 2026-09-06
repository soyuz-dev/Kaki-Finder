import { z } from 'zod';
import { activitySchema, participantGroupSchema, roleSchema, suggestedSlotSchema } from './community';
export const connectionStatusSchema = z.enum(['pending', 'accepted', 'declined', 'cancelled']);
export const connectionSchema = z.strictObject({
  id: z.uuid(), direction: z.enum(['incoming', 'outgoing']), senderName: z.string().min(1).max(80),
  senderGroup: participantGroupSchema, recipientName: z.string().min(1).max(80), activity: activitySchema,
  role: roleSchema, skill: z.string().min(1).max(120).nullable(), suggestedSlot: suggestedSlotSchema.nullable(),
  status: connectionStatusSchema, createdAt: z.iso.datetime({ offset: true }), updatedAt: z.iso.datetime({ offset: true }),
});
export type Connection = z.infer<typeof connectionSchema>;
export const connectionsResponseSchema = z.object({ viewerId: z.uuid(), connections: z.array(connectionSchema) });
export const connectionResponseSchema = z.object({ connection: connectionSchema });
