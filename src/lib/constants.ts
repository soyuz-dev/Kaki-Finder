import type { Activity, ActivityRole, Language, ParticipantGroup } from '@/types/domain';
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

export const ACTIVITY_LABELS: Record<Activity, string> = {
  chess: 'Chess', cooking: 'Cooking', gardening: 'Gardening', language: 'Language exchange',
  dance: 'Dance', badminton: 'Badminton', coding: 'Coding', guitar: 'Guitar',
  fitness: 'Fitness', photography: 'Photography', jogging: 'Jogging',
};
export const ROLE_LABELS: Record<ActivityRole, string> = { teacher: 'Share / teach', learner: 'Learn', partner: 'Do together' };
export const LANGUAGE_LABELS: Record<Language, string> = { english: 'English', mandarin: 'Mandarin', tamil: 'Tamil', malay: 'Malay', hokkien: 'Hokkien' };
export const BRIDGE_LABELS: Record<ParticipantGroup, string> = { 'young-adult': 'Young adult', adult: 'Adult', senior: 'Senior', family: 'Family' };
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const SEARCH_STORAGE_KEY = 'kaki-finder:search:v1';
