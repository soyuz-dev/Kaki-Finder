import { compatibleIntents } from '@/features/matching/find-matches';
import { validateSlot } from '@/features/scheduling/schedule';
import { createCommunityRepository } from '@/lib/repositories';
import { getDataSource } from '@/lib/repositories/config';
import { interestDraftSchema } from '@/lib/validation/community';
import { apiError, HttpError, jsonResponse, readInput } from '@/lib/api/http';
import { z } from 'zod';
import { identity, sameOrigin } from '@/lib/auth/server';
import { createSupabaseRepository } from '@/lib/repositories/supabase';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { expectedAccountId, ...input } = await readInput(request, interestDraftSchema.safeExtend({ expectedAccountId: z.uuid().nullable().default(null) }));
    const account = await identity();
    if ((account?.user.id ?? null) !== expectedAccountId) throw new HttpError(409, 'ACCOUNT_CHANGED', 'Your account changed. Please refresh your results before expressing interest.');
    const repository = createCommunityRepository();
    const [residents, facilities] = await Promise.all([repository.listResidents(account?.user.id), repository.listFacilities()]);
    const resident = residents.find(r => r.id === input.residentId);
    if (!resident || !compatibleIntents(input.request, resident).length) throw new HttpError(400, 'INVALID_MATCH', 'This kaki is no longer compatible. Please refresh your results.');
    const slot = input.suggestedSlot ? validateSlot(input.request, resident, facilities, input.suggestedSlot) : null;
    if (input.suggestedSlot && !slot) throw new HttpError(409, 'SLOT_CHANGED', 'That suggested time is no longer available. Please refresh your results.');
    const storageMode = getDataSource(process.env.DATA_SOURCE);
    if (storageMode === 'fixtures') return jsonResponse({ status: 'local-save-required', storageMode });
    const writer = account ? createSupabaseRepository(account.client, account.user.id) : repository;
    const saved = await writer.recordInterest({ ...input, suggestedSlot: slot });
    // Only authenticated account routes can list records, with ownership RLS.
    return jsonResponse({ status: 'recorded', storageMode, id: saved.id });
  } catch (error) { return apiError(error); }
}
