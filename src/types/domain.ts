export type ParticipantGroup = 'young-adult' | 'adult' | 'senior' | 'family';
export type ActivityRole = 'teacher' | 'learner' | 'partner';
export type Language = 'english' | 'mandarin' | 'tamil' | 'malay' | 'hokkien';
export type Activity = 'chess' | 'cooking' | 'gardening' | 'language' | 'dance' | 'badminton' | 'coding' | 'guitar' | 'fitness' | 'photography' | 'jogging';
export interface AvailabilityWindow {
  /** ISO weekday: Monday = 1, Sunday = 7. Times are local to Singapore. */
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  start: string;
  end: string;
}
export interface ActivityIntent {
  activity: Activity;
  // Role belongs to an activity, never to age: a chess teacher can learn coding.
  role: ActivityRole;
  skill: string | null;
}
export interface Resident {
  id: string;
  name: string;
  ageRange: string;
  participantGroup: ParticipantGroup;
  block: string;
  languages: Language[];
  bio: string;
  intents: ActivityIntent[];
  availability: AvailabilityWindow[];
}
export interface ParsedRequest {
  activity: Activity | null;
  role: ActivityRole | null;
  skill: string | null;
  availability: AvailabilityWindow[];
  languagePreference: Language | null;
  groupPreference: ParticipantGroup | null;
  clarificationFields: Array<'activity' | 'role' | 'skill' | 'availability' | 'languagePreference' | 'groupPreference'>;
}
export interface MatchRequest {
  name: string;
  block: string;
  participantGroup: ParticipantGroup;
  criteria: ParsedRequest;
}
export interface Facility {
  id: string;
  name: string;
  activities: Activity[];
  openings: AvailabilityWindow[];
  // A demo timetable must never be presented as live CC booking availability.
  isDemo: true;
}
export interface SuggestedSlot {
  facilityId: string;
  facilityName: string;
  startAt: string;
  endAt: string;
  needsConfirmation: boolean;
}
export interface Match {
  resident: Resident;
  bridgeScore: number;
  reasons: string[];
  suggestedSlot: SuggestedSlot | null;
}
export interface Interest {
  id: string;
  residentId: string;
  request: MatchRequest;
  suggestedSlot: SuggestedSlot | null;
  createdAt: string;
}
