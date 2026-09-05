import { accountDatabaseError, identity, sameOrigin } from '@/lib/auth/server';
import { apiError, jsonResponse, readInput } from '@/lib/api/http';
import { profileSchema } from '@/lib/validation/account';
export async function GET() {
  try {
    const account = (await identity(true))!;
    const { data, error } = await account.client.from('profiles').select('name,block,participant_group,languages,bio,discoverable,intents,availability').eq('id', account.user.id).maybeSingle();
    if (error) accountDatabaseError(error.code);
    return jsonResponse({ profile: data ? profileSchema.parse({ name: data.name, block: data.block, participantGroup: data.participant_group, languages: data.languages, bio: data.bio, discoverable: data.discoverable, intents: data.intents, availability: data.availability }) : null });
  } catch (error) { return apiError(error); }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const account = (await identity(true))!;
    const input = await readInput(request, profileSchema);
    const { error } = await account.client.from('profiles').upsert({ id: account.user.id, name: input.name, block: input.block, participant_group: input.participantGroup, languages: input.languages, bio: input.bio, discoverable: input.discoverable, intents: input.intents, availability: input.availability });
    if (error) accountDatabaseError(error.code);
    return jsonResponse({ profile: input });
  } catch (error) { return apiError(error); }
}
