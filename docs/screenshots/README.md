# Screenshot Test Results

Automated screenshot testing captures visual proof of all features working correctly.

## Screenshots

All screenshots are located in `test-results/`:

1. `01-home-page.png` - Home page
2. `02-create-session-empty.png` - Empty create session form
3. `02-create-session-filled.png` - Filled create session form
4. `02-create-session-round-robin.png` - Create session with round robin enabled
5. `03-session-stats-empty.png` - Stats tab (no games)
6. `03-session-stats-with-games.png` - Stats tab (with games)
7. `04-session-record-empty.png` - Record tab (empty)
8. `04-session-record-teams-selected.png` - Record tab (teams selected)
9. `04-session-record-ready.png` - Record tab (ready to save)
10. `05-session-history.png` - History tab
11. `06-summary-page.png` - Summary page

## Regenerating Screenshots

```bash
npm run test:screenshots
```

This will automatically:
- Navigate through all pages
- Fill out forms and record games
- Capture screenshots of each feature
- Save to `test-results/`

