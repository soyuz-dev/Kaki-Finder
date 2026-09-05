import type { ActivityIntent, ActivityRole, Facility, Match, MatchRequest, ParticipantGroup, Resident } from '@/types/domain';
import { ACTIVITY_LABELS } from '@/lib/constants';
import { suggestSlot } from '@/features/scheduling/schedule';

export function bridgeScore(a: ParticipantGroup, b: ParticipantGroup): number {
  if (a === b) return 40;
  if ((a === 'senior' && (b === 'young-adult' || b === 'family')) || (b === 'senior' && (a === 'young-adult' || a === 'family'))) return 100;
  return 70;
}
const opposite: Record<ActivityRole, ActivityRole> = { teacher: 'learner', learner: 'teacher', partner: 'partner' };
const tokens = (value: string) => value.toLowerCase().split(/[^a-z]+/).filter(word => word && !['and', 'a', 'the', 'beginner', 'beginners', 'cooking', 'gardening', 'conversation', 'tutoring', 'chess', 'dance', 'guitar', 'coding', 'photography', 'fitness'].includes(word));
export function skillsCompatible(wanted: string | null, offered: string | null): boolean {
  if (!wanted || !offered) return true;
  const a = tokens(wanted), b = tokens(offered);
  return !a.length || !b.length || a.some(token => b.includes(token));
}
export function compatibleIntents(request: MatchRequest, resident: Resident): ActivityIntent[] {
  const { criteria } = request;
  if (!criteria.activity || !criteria.role) return [];
  if (criteria.groupPreference && criteria.groupPreference !== resident.participantGroup) return [];
  if (criteria.languagePreference && !resident.languages.includes(criteria.languagePreference)) return [];
  // Avoid an obvious self-match without pretending name + block is authentication.
  if (request.name.trim().toLowerCase() === resident.name.toLowerCase() && request.block.trim().toLowerCase() === resident.block.toLowerCase()) return [];
  return resident.intents.filter(intent => intent.activity === criteria.activity && intent.role === opposite[criteria.role!] && skillsCompatible(criteria.skill, intent.skill));
}
export function findMatches(request: MatchRequest, residents: Resident[], facilities: Facility[], now = new Date()): Match[] {
  const ranked = residents.flatMap(resident => {
    const intents = compatibleIntents(request, resident);
    if (!intents.length) return [];
    const suggestedSlot = suggestSlot(request, resident, facilities, now);
    const exactSkill = !!request.criteria.skill && intents.some(i => i.skill?.toLowerCase() === request.criteria.skill?.toLowerCase());
    const activity = ACTIVITY_LABELS[request.criteria.activity!].toLowerCase();
    const reasons = [request.criteria.role === 'learner' ? `Can share ${activity} with you` : request.criteria.role === 'teacher' ? `Keen to learn ${activity} from you` : `Up for ${activity} together`];
    if (exactSkill) reasons.push(`Shared focus: ${request.criteria.skill}`);
    if (request.criteria.languagePreference) reasons.push(`Speaks ${request.criteria.languagePreference}`);
    if (suggestedSlot && !suggestedSlot.needsConfirmation) reasons.push('A shared time in the demo timetable');
    if (!suggestedSlot) reasons.push('A compatible kaki; time needs arranging');
    return [{ resident, bridgeScore: bridgeScore(request.participantGroup, resident.participantGroup), suggestedSlot, reasons, exactSkill }];
  });
  return ranked.sort((a, b) => b.bridgeScore - a.bridgeScore ||
    Number(b.resident.isDemo === false) - Number(a.resident.isDemo === false) ||
    Number(!!b.suggestedSlot && !b.suggestedSlot.needsConfirmation) - Number(!!a.suggestedSlot && !a.suggestedSlot.needsConfirmation) ||
    Number(b.exactSkill) - Number(a.exactSkill) || a.resident.id.localeCompare(b.resident.id))
    .slice(0, 3).map(({ resident, bridgeScore, suggestedSlot, reasons }) => ({ resident, bridgeScore, suggestedSlot, reasons }));
}
