import { compatibleIntents } from '@/features/matching/find-matches';
import { validateSlot } from '@/features/scheduling/schedule';
import { createCommunityRepository } from '@/lib/repositories';
import { getDataSource } from '@/lib/repositories/config';
import { interestDraftSchema } from '@/lib/validation/community';
import { apiError, HttpError, jsonResponse, readInput } from '@/lib/api/http';
export async function POST(request: Request) {
  try {
    const input = await readInput(request, interestDraftSchema);
    const repository = createCommunityRepository();
    const [residents, facilities] = await Promise.all([repository.listResidents(), repository.listFacilities()]);
    const resident = residents.find(r => r.id === input.residentId);
    if (!resident || !compatibleIntents(input.request, resident).length) throw new HttpError(400, 'INVALID_MATCH', 'This kaki is no longer compatible. Please refresh your results.');
    const slot = input.suggestedSlot ? validateSlot(input.request, resident, facilities, input.suggestedSlot) : null;
    if (input.suggestedSlot && !slot) throw new HttpError(409, 'SLOT_CHANGED', 'That suggested time is no longer available. Please refresh your results.');
    const storageMode = getDataSource(process.env.DATA_SOURCE);
    if (storageMode === 'fixtures') return jsonResponse({ status: 'local-save-required', storageMode });
    const saved = await repository.recordInterest({ ...input, suggestedSlot: slot });
    // No listing endpoint: a guest request must not reveal another person's records.
    return jsonResponse({ status: 'recorded', storageMode, id: saved.id });
  } catch (error) { return apiError(error); }
}
