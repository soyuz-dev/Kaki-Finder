# Matching

find-matches.ts filters by activity, compatible intent, skill compatibility, and explicit preferences. Age and role are independent. Bridge scores: 100 for senior ↔ young adult/family, 70 for other distinct groups, 40 within one group. Ranking uses bridge, confirmed shared time, exact skill, then stable ID. It returns up to three genuine matches. results-client.tsx loads the saved search and renders cards, empty/error/loading states, and interest actions.
