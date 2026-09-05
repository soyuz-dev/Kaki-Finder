# Enable real neighbour matching

1. Run `supabase/migrations/202609050003_discovery.sql` in Supabase SQL Editor.
   Existing profiles remain private. No account is automatically published.
2. Commit and push the code below from the project terminal, then wait for Vercel's
   Production deployment to become Ready. Use the new deployment before publishing.

```powershell
git add src scripts supabase tests README.md
git diff --cached --stat
git commit -m "Add opt-in neighbour discovery and real resident matching"
git push origin master
```

3. Sign in and open **My account**. Add an introduction, an activity with a role,
   and a weekly time window. Select **Make my profile discoverable**, then save.
4. Use another account or a guest browser to search for a complementary activity:
   for example, publish Chess / Share-teach and search for someone to teach chess.
   The card will be labelled **Community neighbour**. The 15 fictional profiles remain
   labelled **Demo profile**. Cross-generation scoring still takes priority.
5. Save an interest from the second account and check My interests. Uncheck discovery
   and save in the first account. Refresh matching results in the second account:
   the hidden profile should disappear. Its earlier selection remains labelled
   **Neighbour no longer discoverable**.

Roles are per activity, independent of age. Name, block, age group, languages,
introduction, activities and weekly availability become visible in matching results.
Email stays private. Family accounts use the adult's details. Interest selections
still do not send messages or reserve facilities.

For automated verification after applying SQL, start the local app on port 3100 and
run `npm run test:auth`. This uses temporary confirmed accounts, sends no emails, and
cleans up its own users and unreferenced directory rows. `npm test` verifies the SQL
privacy rules without contacting Supabase.
