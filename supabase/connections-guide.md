# Connection requests

## Setup and deployment

Run `supabase/migrations/202609060004_connections.sql` in the Supabase SQL Editor.
It adds a separate request table and controlled creation/response functions. It is
repeatable and does not send or convert any existing saved interest. New projects
can use the complete `supabase/setup.sql` instead.

From the project terminal, commit all the new source, SQL and tests:

```powershell
git add src scripts supabase tests README.md package.json
git diff --cached --stat
git commit -m "Add private connection requests with accept and decline"
git push origin master
```

Wait for the Vercel Production deployment to show Ready. No additional environment
variables, email provider, or API keys are required for this feature.

## Two-account demo

1. Account B publishes a discoverable profile offering Chess / Share-teach, with
   weekly availability. Account A signs in and searches for a chess teacher.
2. On B's **Community neighbour** card, A chooses **Send connection request**.
   The caption states exactly what is shared: the sender's chosen name, age group,
   activity/role/skill, and proposed meetup. Email, block and other availability
   are not included in the request stored for the recipient.
3. B opens **My account → My connections → Received**. Use Refresh requests, or
   return focus to the browser, to see the request. Choose **Accept connection**
   or **Decline**. A sees the same status under **Sent** after refreshing.
4. A can withdraw a pending request. Either participant can cancel an accepted
   connection. Accepted, declined and cancelled requests cannot be reopened by
   a stale response; a new request needs a new request ID.

Accepting a connection does not confirm the proposed time or book a CC facility.
No emails, chat messages, or external notifications are sent. The inbox is the
communication mechanism for this hackathon version. Demo profiles continue to
use the existing interest-save flow; historical real-neighbour interest saves
also remain private and are not automatically sent.

## Privacy and state rules

- Only the sender and recipient can read a request. The receiver is derived from
  the active directory entry, not supplied by the browser.
- Direct inserts, updates and deletes are denied to authenticated clients. The
  creation function derives the sender from the session and checks the target.
  Only the recipient may accept/decline a pending request.
- Row locks make conflicting responses atomic. Identical retries return the
  existing request. Only one pending/accepted request per sender, recipient and
  activity is allowed; a duplicate from another tab cannot send another request.
- Hiding a profile prevents new requests but preserves already shared requests
  and their name/activity snapshots. Existing saved-interest behaviour is unchanged.
- Request details cannot be silently edited after sending. Changing the session
  in another tab causes stale actions to fail until the inbox is refreshed.

## Verification

`npm test` exercises real Postgres policies and lifecycle rules locally via PGlite.
After SQL setup, start the local app on port 3100 and run `npm run test:connections`.
It creates three temporary confirmed Auth users (no emails), verifies participant
isolation and both inboxes, retries, concurrent accept/decline, withdrawal,
cancellation, hiding, self-match rejection and safe fields. It deletes its temporary
users and their requests and cleans up its unreferenced synthetic directory row.
