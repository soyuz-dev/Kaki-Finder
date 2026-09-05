import type { ParticipantGroup } from '@/types/domain';
export const APP_NAME = 'Kaki Finder';
export const TIME_ZONE = 'Asia/Singapore';
export const PARTICIPANT_GROUP_LABELS: Record<ParticipantGroup, string> = {
  'young-adult': '20–40', adult: '41–64', senior: '65+', family: 'Family with kids',
};
export const REQUEST_EXAMPLES = [
  "I'm an uncle who wants to teach chess to young people",
  "I'm a young professional looking for someone to teach me Hokkien cooking",
  'My 8-year-old wants to learn gardening from an experienced neighbor',
  "I'm free Tuesday evenings for badminton with anyone",
] as const;
