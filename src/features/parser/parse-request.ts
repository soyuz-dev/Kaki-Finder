import type { Activity, ActivityRole, AvailabilityWindow, Language, ParsedRequest, ParticipantGroup } from '@/types/domain';

const activityPatterns: Array<[Activity, RegExp]> = [
  ['chess', /\b(chess|xiangqi)\b/], ['cooking', /\b(cook(?:ing)?|recipes?|baking|bake)\b/],
  ['gardening', /\b(garden(?:ing)?|plants?|herbs|grow vegetables)\b/],
  ['language', /\b(language|conversation|english tutoring|learn (?:english|mandarin|tamil|malay|hokkien))\b/],
  ['dance', /\b(dance|dancing|bharatanatyam)\b/], ['badminton', /\b(badminton|shuttlecock)\b/],
  ['coding', /\b(coding|code|programming|software)\b/], ['guitar', /\b(guitar|chords?)\b/],
  ['fitness', /\b(fitness|exercise|workout|work out|yoga)\b/], ['photography', /\b(photography|photos?|camera)\b/],
  ['jogging', /\b(jog(?:ging)?|running|run|walking|walk)\b/],
];
const days: Array<[AvailabilityWindow['day'], RegExp]> = [
  [1, /\bmon(?:day)?s?\b/], [2, /\btue(?:sday|s)?s?\b/], [3, /\bwed(?:nesday)?s?\b/],
  [4, /\bthu(?:rsday|rs)?s?\b/], [5, /\bfri(?:day)?s?\b/], [6, /\bsat(?:urday)?s?\b/], [7, /\bsun(?:day)?s?\b/],
];
const allDays = days.map(([day]) => day);
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
function minutes(hour: number, minute: number, suffix?: string) {
  if (minute > 59 || hour > 23 || (suffix && (hour < 1 || hour > 12))) return null;
  return (suffix ? hour % 12 + (suffix === 'pm' ? 12 : 0) : hour) * 60 + minute;
}

function timeRange(text: string): { start: string; end: string } | null {
  const range = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (range) {
    const [, h1, m1, a1, h2, m2, a2] = range;
    let start = minutes(Number(h1), Number(m1 || 0), a1 || a2);
    const end = minutes(Number(h2), Number(m2 || 0), a2 || a1);
    // "10–2pm" means 10am–2pm, not an overnight window.
    if (!a1 && a2 === 'pm' && start !== null && end !== null && start >= end && Number(h1) < 12) start -= 12 * 60;
    if (start !== null && end !== null && start >= 0 && start < end) return { start: clock(start), end: clock(end) };
  }
  const single = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (single && !range) {
    const start = minutes(Number(single[1]), Number(single[2] || 0), single[3]);
    if (start !== null && start + 60 < 24 * 60) return { start: clock(start), end: clock(start + 60) };
  }
  if (/\bmornings?\b/.test(text)) return { start: '09:00', end: '12:00' };
  if (/\bafternoons?\b/.test(text)) return { start: '12:00', end: '18:00' };
  if (/\b(evenings?|nights?)\b/.test(text)) return { start: '18:00', end: '21:00' };
  return null;
}

export function parseAvailability(text: string): { windows: AvailabilityWindow[]; needsReview: boolean } {
  // Negation and relative dates need a human choice rather than a guessed slot.
  if (/\b(not|except|unavailable|tomorrow|today|next week|fortnight)\b|\b(after|before|between)\s+\d/.test(text)) return { windows: [], needsReview: true };
  const found = days.flatMap(([day, pattern]) => {
    const match = text.match(pattern);
    return match ? [{ day, index: match.index!, end: match.index! + match[0].length }] : [];
  }).sort((a, b) => a.index - b.index);
  const overallTime = timeRange(text);
  let selected: AvailabilityWindow['day'][] = found.map(item => item.day);
  if (/\bweekends?\b/.test(text)) selected = [...selected, 6, 7];
  if (/\bweekdays?\b/.test(text)) selected = [...selected, 1, 2, 3, 4, 5];
  if (found.length === 2 && /^\s*(?:to|through|-)\s*$/.test(text.slice(found[0].end, found[1].index))) {
    selected = [];
    let day = found[0].day;
    while (true) { selected.push(day); if (day === found[1].day) break; day = (day % 7 + 1) as AvailabilityWindow['day']; }
  }
  if (!selected.length && overallTime) selected = allDays;
  if (!selected.length) {
    const ambiguous = /\b(?:at|after|before|from|between)\s+\d|\b\d{1,2}:\d{2}\b/.test(text);
    return { windows: [], needsReview: ambiguous };
  }
  const manyPeriods = (text.match(/\b(mornings?|afternoons?|evenings?|nights?)\b/g) || []).length > 1;
  const windows = [...new Set(selected)].map(day => {
    const marker = found.find(item => item.day === day);
    const index = marker ? found.indexOf(marker) : -1;
    const segment = marker ? text.slice(marker.end, found[index + 1]?.index) : '';
    return { day, ...(timeRange(segment) || (!manyPeriods ? overallTime : null) || { start: '09:00', end: '21:00' }) };
  });
  const ambiguous = (/\b(?:at|from)\s+\d/.test(text) && !overallTime) || (manyPeriods && found.length <= 1);
  return { windows, needsReview: ambiguous };
}

function extractSkill(text: string, activity: Activity | null): string | null {
  if (activity === 'cooking') {
    const dish = text.match(/\b(hokkien|malay|indian|chinese|peranakan|italian|french|vegetarian|halal)\s+(cooking|recipes?|food|dishes)\b/);
    if (dish) return `${dish[1]} cooking`;
    if (/\bbak(?:e|ing)\b/.test(text)) return 'baking';
  }
  if (activity === 'language') {
    const language = text.match(/\b(english|mandarin|tamil|malay|hokkien)\b/);
    if (language) return `${language[1]} conversation`;
  }
  if (activity === 'dance' && /\b(traditional|bharatanatyam)\b/.test(text)) return /indian|bharatanatyam/.test(text) ? 'traditional Indian dance' : 'traditional dance';
  if (activity === 'gardening' && /\bherbs?\b/.test(text)) return 'herbs and container gardening';
  if (activity === 'photography' && /\b(phone|mobile)\b/.test(text)) return 'phone photography';
  if (activity && /\bbeginners?\b/.test(text)) return `beginner ${activity}`;
  return null;
}

export function parseRequest(input: string): ParsedRequest {
  const text = input.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  let activities = activityPatterns.filter(([, pattern]) => pattern.test(text)).map(([activity]) => activity);
  if (!activities.length && /\b(english|mandarin|tamil|malay|hokkien)\b/.test(text)) activities = ['language'];
  const activity = activities.length === 1 ? activities[0] : null;
  const learns = /\b(learn|learning|learner|teach me|teach us|show me|show us|tutor me)\b/.test(text) || /someone to teach/.test(text);
  const teaches = /\b(teach|teaching|tutor|tutoring|mentor|share my|share skills|show someone)\b/.test(text) && !/\b(teach me|teach us|tutor me)\b|someone to teach/.test(text);
  let role: ActivityRole | null = learns && !teaches ? 'learner' : teaches && !learns ? 'teacher' : null;
  // Equal-partner sports are the useful default only when no learning/teaching intent exists.
  if (!learns && !teaches && (/\b(partner|buddy|buddies|together|company|play|exchange|anyone)\b/.test(text) || activity === 'badminton' || activity === 'jogging')) role = 'partner';
  let groupPreference: ParticipantGroup | null = null;
  if (/\b(?:with|from|to|for)\s+(?:(?:a|an|the|some|any)\s+)?(?:young|youth|20s|30s)/.test(text)) groupPreference = 'young-adult';
  else if (/\b(?:with|from|to|for)\s+(?:(?:a|an|the|some|any)\s+)?(?:senior|elderly|older)/.test(text)) groupPreference = 'senior';
  else if (/\b(?:with|from|to|for)\s+(?:(?:a|an|the|some|any)\s+)?(?:families|family|kids|children)/.test(text)) groupPreference = 'family';
  const languageMatch = text.match(/\b(?:in|speak|speaks|speaking|prefer|prefers|language:)\s+(english|mandarin|tamil|malay|hokkien)\b/) || text.match(/\b(english|mandarin|tamil|malay|hokkien)[ -]speaking\b/);
  const languagePreference = languageMatch ? languageMatch[1] as Language : null;
  const availability = parseAvailability(text);
  const clarificationFields: ParsedRequest['clarificationFields'] = [];
  if (!activity) clarificationFields.push('activity');
  if (!role) clarificationFields.push('role');
  if (availability.needsReview) clarificationFields.push('availability');
  return { activity, role, skill: extractSkill(text, activity), availability: availability.windows,
    languagePreference, groupPreference, clarificationFields };
}
