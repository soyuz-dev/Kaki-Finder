import { z } from 'zod';

export const participantGroupSchema = z.enum(['young-adult', 'adult', 'senior', 'family']);
export const activitySchema = z.enum(['chess', 'cooking', 'gardening', 'language', 'dance', 'badminton', 'coding', 'guitar', 'fitness', 'photography', 'jogging']);
export const roleSchema = z.enum(['teacher', 'learner', 'partner']);
export const languageSchema = z.enum(['english', 'mandarin', 'tamil', 'malay', 'hokkien']);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const availabilitySchema = z.strictObject({
  day: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]),
  start: timeSchema,
  end: timeSchema,
}).refine(value => value.start < value.end, 'Availability must end after it starts');
const skillSchema = z.string().trim().min(1).max(120).nullable();
export const intentSchema = z.strictObject({ activity: activitySchema, role: roleSchema, skill: skillSchema });
export const residentSchema = z.strictObject({
  id: z.uuid(), name: z.string().trim().min(1).max(80), ageRange: z.string().min(1).max(40),
  participantGroup: participantGroupSchema, block: z.string().trim().min(1).max(20),
  languages: z.array(languageSchema).min(1).max(5), bio: z.string().min(1).max(600),
  intents: z.array(intentSchema).min(1).max(20), availability: z.array(availabilitySchema).max(21),
});
export const facilitySchema = z.strictObject({
  id: z.uuid(), name: z.string().min(1).max(100), activities: z.array(activitySchema).min(1).max(11),
  openings: z.array(availabilitySchema).max(21), isDemo: z.literal(true),
});
export const parsedRequestSchema = z.strictObject({
  activity: activitySchema.nullable(), role: roleSchema.nullable(), skill: skillSchema,
  availability: z.array(availabilitySchema).max(21), languagePreference: languageSchema.nullable(),
  groupPreference: participantGroupSchema.nullable(),
  clarificationFields: z.array(z.enum(['activity', 'role', 'skill', 'availability', 'languagePreference', 'groupPreference'])).max(6),
});
export const matchRequestSchema = z.strictObject({
  name: z.string().trim().min(1).max(80), block: z.string().trim().min(1).max(20),
  participantGroup: participantGroupSchema, criteria: parsedRequestSchema,
});
export const confirmedMatchRequestSchema = matchRequestSchema.refine(value =>
  value.criteria.activity !== null && value.criteria.role !== null && value.criteria.clarificationFields.length === 0,
  'Choose an activity, role, and resolve the highlighted details before matching');
export const suggestedSlotSchema = z.strictObject({
  facilityId: z.uuid(), facilityName: z.string().min(1).max(100),
  startAt: z.iso.datetime({ offset: true }), endAt: z.iso.datetime({ offset: true }),
  needsConfirmation: z.boolean(),
}).refine(value => Date.parse(value.endAt) - Date.parse(value.startAt) === 60 * 60 * 1000, 'Slots must last 60 minutes');
export const interestDraftSchema = z.strictObject({
  clientRequestId: z.uuid(), residentId: z.uuid(), request: confirmedMatchRequestSchema,
  suggestedSlot: suggestedSlotSchema.nullable(),
}).refine(value => value.request.criteria.activity !== null && value.request.criteria.role !== null, 'Confirm activity and role before recording interest');
export const interestSchema = z.strictObject({
  ...interestDraftSchema.shape,
  id: z.uuid(), createdAt: z.iso.datetime({ offset: true }),
});

export const parseInputSchema = z.strictObject({ text: z.string().trim().min(3).max(1000) });
export const searchSessionSchema = z.strictObject({ id: z.uuid(), text: z.string().max(1000), request: confirmedMatchRequestSchema });
export const matchesResponseSchema = z.strictObject({
  storageMode: z.enum(['fixtures', 'supabase']),
  matches: z.array(z.strictObject({ resident: residentSchema, bridgeScore: z.union([z.literal(40), z.literal(70), z.literal(100)]),
    reasons: z.array(z.string()), suggestedSlot: suggestedSlotSchema.nullable() })).max(3),
});
export const interestResponseSchema = z.strictObject({
  status: z.enum(['recorded', 'local-save-required']), storageMode: z.enum(['fixtures', 'supabase']), id: z.uuid().optional(),
});
export type SearchSession = z.infer<typeof searchSessionSchema>;
export type MatchesResponse = z.infer<typeof matchesResponseSchema>;
