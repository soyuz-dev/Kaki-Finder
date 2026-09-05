import type { AvailabilityWindow, Facility, MatchRequest, Resident, SuggestedSlot } from '@/types/domain';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const OFFSET = 8 * 60 * MINUTE;
const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
const weekday = (midnight: number) => (new Date(midnight + OFFSET).getUTCDay() || 7) as AvailabilityWindow['day'];
const midnightInSingapore = (now: Date) => Date.parse(new Date(now.getTime() + OFFSET).toISOString().slice(0, 10) + 'T00:00:00+08:00');

export function suggestSlot(request: MatchRequest, resident: Resident, facilities: Facility[], now = new Date()): SuggestedSlot | null {
  if (!request.criteria.activity) return null;
  const firstDay = midnightInSingapore(now);
  const slots: SuggestedSlot[] = [];
  for (let offset = 0; offset < 14; offset++) {
    const midnight = firstDay + offset * DAY;
    const day = weekday(midnight);
    const requested = request.criteria.availability.length ? request.criteria.availability.filter(w => w.day === day) : [{ day, start: '00:00', end: '23:59' }];
    for (const facility of facilities.filter(f => f.activities.includes(request.criteria.activity!))) {
      for (const opening of facility.openings.filter(w => w.day === day)) {
        for (const offered of resident.availability.filter(w => w.day === day)) {
          for (const wanted of requested) {
            const start = Math.max(minutes(opening.start), minutes(offered.start), minutes(wanted.start), Math.ceil((now.getTime() - midnight) / MINUTE));
            const end = Math.min(minutes(opening.end), minutes(offered.end), minutes(wanted.end));
            if (start + 60 <= end) slots.push({ facilityId: facility.id, facilityName: facility.name,
              startAt: new Date(midnight + start * MINUTE).toISOString(), endAt: new Date(midnight + (start + 60) * MINUTE).toISOString(),
              needsConfirmation: request.criteria.availability.length === 0 });
          }
        }
      }
    }
    if (slots.length) break;
  }
  return slots.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.facilityId.localeCompare(b.facilityId))[0] || null;
}

/** Recheck the displayed slot on save instead of trusting client-supplied venue/time. */
export function validateSlot(request: MatchRequest, resident: Resident, facilities: Facility[], slot: SuggestedSlot, now = new Date()): SuggestedSlot | null {
  const facility = facilities.find(f => f.id === slot.facilityId && request.criteria.activity && f.activities.includes(request.criteria.activity));
  if (!facility) return null;
  const start = Date.parse(slot.startAt), end = Date.parse(slot.endAt);
  if (!Number.isFinite(start) || end - start !== 60 * MINUTE || start < now.getTime() || start >= midnightInSingapore(now) + 14 * DAY) return null;
  const midnight = midnightInSingapore(new Date(start));
  const day = weekday(midnight), startMinutes = (start - midnight) / MINUTE, endMinutes = (end - midnight) / MINUTE;
  const contains = (w: AvailabilityWindow) => w.day === day && minutes(w.start) <= startMinutes && minutes(w.end) >= endMinutes;
  if (!facility.openings.some(contains) || !resident.availability.some(contains) || (request.criteria.availability.length > 0 && !request.criteria.availability.some(contains))) return null;
  return { ...slot, facilityName: facility.name, needsConfirmation: request.criteria.availability.length === 0 };
}
