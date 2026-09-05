import { findMatches } from '@/features/matching/find-matches';
import { createCommunityRepository } from '@/lib/repositories';
import { getDataSource } from '@/lib/repositories/config';
import { confirmedMatchRequestSchema } from '@/lib/validation/community';
import { apiError, jsonResponse, readInput } from '@/lib/api/http';
import { identity } from '@/lib/auth/server';
export async function POST(request: Request) {
  try {
    const input = await readInput(request, confirmedMatchRequestSchema);
    const repository = createCommunityRepository();
    const account = await identity();
    const [residents, facilities] = await Promise.all([repository.listResidents(account?.user.id), repository.listFacilities()]);
    return jsonResponse({ matches: findMatches(input, residents, facilities), storageMode: getDataSource(process.env.DATA_SOURCE), ownerId: account?.user.id ?? null });
  } catch (error) { return apiError(error); }
}
