import { z } from 'zod';
import { languageSchema, participantGroupSchema } from './community';

export const profileSchema = z.strictObject({
  name: z.string().trim().min(1, 'Please enter your name.').max(80),
  block: z.string().trim().min(1, 'Please enter your block.').max(20),
  participantGroup: participantGroupSchema,
  languages: z.array(languageSchema).min(1, 'Choose at least one language.').max(5),
  bio: z.string().trim().max(600),
});
export type AccountProfile = z.infer<typeof profileSchema>;
export const emailSchema = z.email().max(254);
export const passwordSchema = z.string().min(8, 'Use at least 8 characters.').max(128);
export const authActionSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('sign-in'), email: emailSchema, password: z.string().min(1).max(128) }),
  z.strictObject({ action: z.literal('sign-up'), email: emailSchema, password: passwordSchema, adult: z.literal(true, { error: 'Accounts must be managed by an adult aged 18 or older.' }) }),
  z.strictObject({ action: z.literal('forgot-password'), email: emailSchema }),
  z.strictObject({ action: z.literal('password'), password: passwordSchema }),
  z.strictObject({ action: z.literal('sign-out') }),
]);
