import { z } from 'zod';
import { identity, sameOrigin } from '@/lib/auth/server';
import { apiError, HttpError, jsonResponse, readInput } from '@/lib/api/http';
import { interestDraftSchema } from '@/lib/validation/community';
import { createCommunityRepository } from '@/lib/repositories';
import { mapConnection, connectionFailure } from '@/lib/repositories/connections';
import { compatibleIntents } from '@/features/matching/find-matches';
import { validateSlot } from '@/features/scheduling/schedule';

export async function GET() {
  try {
    const account = (await identity(true))!;
    const { data, error } = await account.client.from('connection_requests').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) connectionFailure(error.code);
    return jsonResponse({ viewerId: account.user.id, connections: (data || []).map(row => mapConnection(row, account.user.id)) });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const account = (await identity(true))!;
    const { expectedAccountId, ...input } = await readInput(request, interestDraftSchema.safeExtend({ expectedAccountId: z.uuid() }));
    if (expectedAccountId !== account.user.id) throw new HttpError(409, 'ACCOUNT_CHANGED', 'Your account changed. Please refresh your matching results.');
    // A lost response can be retried even after the proposal time has passed.
    const previous = await account.client.from('connection_requests').select('*').eq('client_request_id', input.clientRequestId).eq('sender_id', account.user.id).maybeSingle();
    if (previous.error) connectionFailure(previous.error.code);
    if (!previous.data) {
      const repository = createCommunityRepository();
      const [residents, facilities] = await Promise.all([repository.listResidents(account.user.id), repository.listFacilities()]);
      const resident = residents.find(r => r.id === input.residentId);
      if (!resident || resident.isDemo !== false || !compatibleIntents(input.request, resident).length) throw new HttpError(409, 'INVALID_MATCH', 'This neighbour is no longer available for this activity. Please refresh your matches.');
      if (input.suggestedSlot) {
        const canonical = validateSlot(input.request, resident, facilities, input.suggestedSlot);
        if (!canonical || canonical.facilityName !== input.suggestedSlot.facilityName || canonical.needsConfirmation !== input.suggestedSlot.needsConfirmation) throw new HttpError(409, 'SLOT_CHANGED', 'The suggested time changed. Please refresh your matches.');
      }
    }
    const { data, error } = await account.client.rpc('create_connection_request', {
      p_client_request_id: input.clientRequestId, p_resident_id: input.residentId,
      p_sender_name: input.request.name, p_sender_group: input.request.participantGroup,
      p_activity: input.request.criteria.activity, p_role: input.request.criteria.role,
      p_skill: input.request.criteria.skill, p_suggested_slot: input.suggestedSlot,
    }).single();
    if (error) connectionFailure(error.code);
    return jsonResponse({ connection: mapConnection(data, account.user.id) });
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const account = (await identity(true))!;
    const { id, status, expectedAccountId } = await readInput(request, z.strictObject({ id: z.uuid(), status: z.enum(['accepted', 'declined', 'cancelled']), expectedAccountId: z.uuid() }));
    if (expectedAccountId !== account.user.id) throw new HttpError(409, 'ACCOUNT_CHANGED', 'Your account changed. Refresh your connections.');
    const { data, error } = await account.client.rpc('respond_connection_request', { p_id: id, p_status: status }).single();
    if (error) connectionFailure(error.code);
    return jsonResponse({ connection: mapConnection(data, account.user.id) });
  } catch (error) { return apiError(error); }
}
