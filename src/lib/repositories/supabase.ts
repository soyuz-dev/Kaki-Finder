import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { facilitySchema, interestDraftSchema, interestSchema, residentSchema } from '@/lib/validation/community';
import type { Interest, InterestDraft } from '@/types/domain';
import { databaseFailure, RepositoryError } from './errors';
import type { CommunityRepository } from './types';

const rowSchema = z.record(z.string(), z.unknown());
export function mapResidentRow(value: unknown) {
  const row = rowSchema.parse(value);
  return residentSchema.parse({ id: row.id, name: row.name, ageRange: row.age_range,
    participantGroup: row.participant_group, block: row.block, languages: row.languages,
    bio: row.bio, intents: row.intents, availability: row.availability });
}
export function mapFacilityRow(value: unknown) {
  const row = rowSchema.parse(value);
  return facilitySchema.parse({ id: row.id, name: row.name, activities: row.activities,
    openings: row.openings, isDemo: row.is_demo });
}
export function mapInterestRow(value: unknown) {
  const row = rowSchema.parse(value);
  return interestSchema.parse({ id: row.id, clientRequestId: row.client_request_id,
    residentId: row.resident_id, request: row.request, suggestedSlot: row.suggested_slot,
    createdAt: row.created_at });
}
export function assertSameInterest(existing: Interest, draft: InterestDraft) {
  if (existing.residentId !== draft.residentId ||
      JSON.stringify(existing.request) !== JSON.stringify(draft.request) ||
      JSON.stringify(existing.suggestedSlot) !== JSON.stringify(draft.suggestedSlot)) {
    throw new RepositoryError('IDEMPOTENCY_CONFLICT', 'Use a new request ID for a different interest selection.');
  }
}

/** Inject a trusted server client. No browser client should call this repository. */
export function createSupabaseRepository(client: SupabaseClient): CommunityRepository {
  return {
    async listResidents() {
      const { data, error } = await client.from('residents').select('*').order('id');
      if (error) databaseFailure('load residents', error.code);
      return (data ?? []).map(mapResidentRow);
    },
    async listFacilities() {
      const { data, error } = await client.from('facilities').select('*').order('id');
      if (error) databaseFailure('load facilities', error.code);
      return (data ?? []).map(mapFacilityRow);
    },
    async recordInterest(input) {
      const draft = interestDraftSchema.parse(input);
      const row = { client_request_id: draft.clientRequestId, resident_id: draft.residentId,
        request: draft.request, suggested_slot: draft.suggestedSlot };
      // DO NOTHING on collision prevents a retry from modifying an earlier selection.
      const inserted = await client.from('interests').upsert(row, {
        onConflict: 'client_request_id', ignoreDuplicates: true,
      }).select('*').maybeSingle();
      if (inserted.error) databaseFailure('record interest', inserted.error.code);
      if (inserted.data) return mapInterestRow(inserted.data);
      const existing = await client.from('interests').select('*').eq('client_request_id', draft.clientRequestId).single();
      if (existing.error) databaseFailure('confirm interest', existing.error.code);
      const interest = mapInterestRow(existing.data);
      assertSameInterest(interest, draft);
      return interest;
    },
  };
}
