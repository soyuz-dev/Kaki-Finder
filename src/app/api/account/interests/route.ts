import { z } from 'zod';
import { accountDatabaseError, identity, sameOrigin } from '@/lib/auth/server';
import { apiError, jsonResponse, readInput } from '@/lib/api/http';
import { mapInterestRow } from '@/lib/repositories/supabase';
import { createCommunityRepository } from '@/lib/repositories';
export async function GET() {
  try {
    const account = (await identity(true))!;
    // This client carries the resident's session: RLS enforces ownership too.
    const { data, error } = await account.client.from('interests').select('*').eq('user_id', account.user.id).order('created_at', { ascending: false }).limit(100);
    if (error) accountDatabaseError(error.code);
    // Empty histories need no directory access, so a new account can still load.
    const residents = data?.length ? await createCommunityRepository().listResidents() : [];
    return jsonResponse({ interests: (data || []).map(row => ({ ...mapInterestRow(row), residentName: residents.find(r => r.id === row.resident_id)?.name || 'Neighbour no longer discoverable' })) });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const account = (await identity(true))!;
    const { id } = await readInput(request, z.strictObject({ id: z.uuid() }));
    const { error } = await account.client.from('interests').delete().eq('id', id).eq('user_id', account.user.id);
    if (error) accountDatabaseError(error.code);
    return jsonResponse({ removed: true });
  } catch (error) { return apiError(error); }
}
