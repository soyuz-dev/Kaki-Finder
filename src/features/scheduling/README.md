# Scheduling

schedule.ts intersects requester, resident, and demo facility availability. It uses Asia/Singapore, a 14-calendar-day horizon, and 60-minute slots, with an injectable date for tests. Missing availability permits a proposal needing confirmation. No overlap means time to arrange. validateSlot rechecks the displayed venue/time before an interest is saved. Suggestions never reserve a venue.
