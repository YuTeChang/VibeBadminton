# Changelog

## [Unreleased] - 2025-01

### Added
- **Manual Sync Button**: Added "Sync" button to session page for multi-user collaboration
  - Fetches latest games from all users in the session
  - Shows "Last synced" timestamp
  - Spinning animation while syncing
  - Fixes issue where users couldn't see each other's recorded games

### Changed
- **Removed localStorage Caching**: Simplified data architecture for better multi-user sync
  - Removed ~300 lines of complex localStorage caching logic
  - Now always fetches fresh data from API on page load
  - Kept sessionStorage for current session ID (navigation only)
  - Kept localStorage for recent groups (user preference, max 3)
  - Fixes stale data issues where browser refresh showed outdated games

### Fixed
- **Multi-User Sync Bug**: Users can now see games recorded by others in the same session
  - Previously each user only saw their own games unless opening in incognito mode
  - Root cause: localStorage was caching stale data and skipping API fetches
  - Solution: Always fetch fresh from API, no caching
- **Severe Memory Leak**: Chrome could reach 32GB after idling/navigating
  - Root causes: orphaned `setTimeout` timers, unbounded `allSessions`/`groups` caches, and unbounded Supabase queries pulling all games
  - Fixes: timer cleanup on unmount, cache caps (`MAX_CACHED_SESSIONS=50`, `MAX_CACHED_GROUPS=20`), and query limits across services
  - Added unmount cleanup for heavy group stats state to release memory
- **Win Streak Bug**: Best win streak can no longer exceed total wins
  - Example: Player with 7-1 record was showing 8 best win streak (impossible)
  - Root cause: `reverseGameResult` never decremented `best_win_streak` on game deletion
  - Solution: Cap `best_win_streak` to never exceed `wins` count
  - Added validation in group overview stats display as safety check
- **Streak Reset on Deletion**: Current streak now properly resets when games are deleted
  - Previously streak tracking became inaccurate after deletions
  - Now resets to 0 since we can't accurately track after deletion

### Added
- **Soft-Delete Players**: Players removed from groups are now soft-deleted instead of permanently deleted
  - Preserves player ID, ELO rating, and all stats
  - Re-adding a player with the same name automatically restores their stats
  - Session player links remain intact (no re-linking needed)
  - New `is_active` column in `group_players` table (migration 006)
- **Progressive Game Loading**: Recent Games section now loads progressively
  - Shows 3 games by default
  - "Load 5 More" button to incrementally load more games
  - "Show Less" to collapse back to 3 games
  - Prevents loading large amounts of data at once
- **Clutch Stats**: Track games won by narrow margins (1-2 points) - the reverse of unlucky games
  - New `ClutchGame` type tracking close wins
  - Clutch Player and Clutch Pairing shown in Group Overview
  - Player and Pairing profiles now show "Close Games" section with both clutch and unlucky tiles
  - Clickable tiles expand to show specific game history with scores and dates
  - Green styling for clutch (🎯), red styling for unlucky (💔)
- **Statistics Documentation**: New comprehensive STATS_GUIDE.md explaining all statistics
  - How each stat is calculated and what it means
  - Tips for interpreting stats correctly
  - ELO system explanation
  - Statistical significance guidance

### Changed
- **Player/Pairing Profile Sheets**: Redesigned unlucky games section as "Close Games"
  - Two-column tile layout showing clutch and unlucky counts
  - Tap either tile to expand game history below
  - Better visual hierarchy with emoji icons and count display

### Fixed
- **Current Streak Bug**: Fixed incorrect streak calculation that showed cumulative historic streaks
  - Now correctly shows only consecutive wins/losses from the most recent game
  - Added `streakBroken` flag to stop counting when streak pattern breaks
  - Example: L W L W W correctly shows +2 (win streak), not historic cumulative value
- **Dream Team Display**: Changed from showing "(8g)" to showing W-L record "(6-2)"
  - More informative display showing actual wins and losses
- **Partner/Opponent Visibility**: Changed from showing only top 3 to expandable full list
  - "Show All" button to reveal all partners/opponents
  - Fixes issue where "Struggles with X" or "Nemesis: X" callouts referenced invisible players
  - Now shows count in header (e.g., "Partners (7)")

### Removed
- **Debug scripts**: Removed one-off development debug scripts from `scripts/` folder

### Added
- **Vercel Analytics & Speed Insights**: Real-time visitor tracking and performance monitoring
  - Web Analytics for page views and visitor counts
  - Speed Insights for performance metrics (desktop/mobile)
  - Components added to app layout for automatic tracking
- **Matchup Detail View**: Click into opponent pairings to see full game history
  - New `MatchupDetailSheet` component with head-to-head record, points breakdown, and game history
  - Points for/against tracked per opponent pairing
  - Shows dominance indicator based on win rate
- **Enhanced Pairing Matchups**: Points tracking against each opponent pairing
  - `PairingMatchup` type now includes `pointsFor`, `pointsAgainst`, `pointDifferential`, and `games` array
  - Clickable matchup rows with inline points display
  - `computeMatchupsFromGames()` now tracks scores and game details
- **Best Win Streak**: Track best win streak ever for players and pairings
  - Added `bestWinStreak` to player profiles and pairing stats
  - Computed from actual game history for accuracy
- **Points Breakdown**: Show points scored vs conceded instead of just differential
  - Player profile shows "Pts For" (green), "Pts Against" (red), and "+/-"
  - Pairing profile shows same breakdown
- **Guest Player Mode**: Full guest mode with promotion option
  - When typing a non-group name in session creation, prompt to "Add as Guest" or "Add to Group"
  - Guests marked with yellow badge (👤 Guest) throughout the app
  - Guest players don't pollute group leaderboard but group players still get stats when playing with/against guests
  - "Recent Guests" section in Players tab showing unlinked players from last 30 days
  - "Add to Group" button to promote guest to full group player (links past sessions automatically)
  - Dashed yellow border styling for guest player cards
- **Pairing Qualification System**: Minimum 5 games for ranking
  - Pairs with < 5 games shown with asterisk (*) and dashed border
  - Qualified pairs sorted first, then by win rate
  - Help text explains qualification requirement
- **Enhanced Recent Games Display**: Show full match details in session view
  - "Winner beat Loser" format instead of just "Winner won"
  - Score displayed (e.g., "21-15") when available
  - Winner name highlighted in green
- **Code-Based Group Access**: New streamlined home page with group code input
  - Enter group code (e.g., `i1lcbcsl`) to join any group
  - Recent groups stored in localStorage for quick access (last 3)
  - Zero API calls on home page load (instant rendering)
  - Scales infinitely regardless of number of groups/sessions
- **Recent Games in Profile Sheets**: Show last 3 games with results in player and pairing profiles
  - Team names, scores, and win/loss indicator for each game
  - Green/red background for quick win/loss identification
- **Games & Sessions Count**: Player profile now shows total games and sessions played in overview
- **Score Validation**: Prevent recording games where losing team score > winning team score
  - Error message displayed when validation fails
  - Save button disabled until scores are valid
- **Pairing Stats Feature**: Track doubles team combination performance
  - New "Pairings" tab on group page showing best pairs by win rate
  - Pairing profile modal with detailed stats (W-L, win rate, recent form)
  - Head-to-head matchups showing performance against other pairings
  - Stored aggregates for fast queries (partner_stats, pairing_matchups tables)
  - Auto-updates when games are recorded or deleted
- **Admin Operations Guide**: New ADMIN.md with complete admin documentation
  - API endpoints for stats recalculation
  - Database queries for troubleshooting
  - Rate limiting documentation

### Fixed
- **Stats Accuracy**: Leaderboard now computes wins/losses from actual games
  - Previously used stored stats which could get out of sync
  - Now always accurate regardless of database state
- **Pair ELO Display**: ELO rating now correctly fetched and displayed for pairings
- **200% Win Rate Bug**: Fixed data corruption issue where wins could exceed total games

### Changed
- **Removed "Most Active" from Group Overview**: Simplified group stats card
  - Removed mostActivePlayer query (one fewer DB call)
  - Cleaner UI focusing on total games, sessions, and closest rivalry
- **Admin-Only Operations**: Moved sensitive operations out of UI
  - Delete Group: Removed from UI, available via API only
  - Recalculate Stats: Removed from UI, available via API only (rate-limited to 5 min)
- **Documentation Overhaul**: Updated all docs with new features and admin guide

### Added (Previous)
- **Delete Functionality**: Delete sessions and groups with confirmation dialogs
  - Delete button on dashboard session cards
  - ~~Delete button on group page header~~ (moved to admin-only)
  - Delete button on session page header
  - All deletions require confirmation to prevent accidents
- **Search Functionality**: Search standalone sessions by name on dashboard
  - Real-time filtering as you type
  - Case-insensitive substring matching
- **Edit Session**: Edit session name and date after creation
  - "Edit Session" button on session page
  - Modal form for quick edits
- **Lightweight Summary Endpoint**: New `/api/sessions/summary` endpoint for faster dashboard loading
  - Returns only essential fields (id, name, date, playerCount, gameMode, groupId)
  - ~80% smaller payload than full sessions endpoint
  - Eliminates N+1 query problems

### Fixed
- **Duplicate API Calls**: Eliminated duplicate API calls throughout the app
  - Dashboard no longer makes N API calls per group for session counts
  - Session pages prevent duplicate loadSession calls
  - Context uses refs to prevent simultaneous duplicate calls
- **Group Page Refresh**: Fixed issue where new sessions didn't appear after creation
  - Improved pathname change detection
  - Better refresh logic when navigating back to group page
- **"Back to Home" Links**: Fixed all "Back to Home" links to point to home page (`/`) instead of dashboard
- **Betting Default**: Changed betting default from ON to OFF for new sessions

### Changed
- **Home Page Architecture**: Refactored home page structure
  - Home page (`/`) is now simple landing page with navigation links
  - Dashboard page (`/dashboard`) contains all sessions and groups display
  - Prevents expensive API calls on initial page load
- **API Optimization**: Optimized all session fetching endpoints
  - Batch queries instead of N+1 queries
  - Summary endpoint for dashboard (much faster)
  - Better caching and deduplication
- **Dashboard Performance**: Dashboard now loads much faster
  - Uses lightweight summary endpoint
  - Calculates group counts from summaries (no extra API calls)
  - Lazy loading only when needed

### Performance Improvements
- **Dashboard Load Time**: ~70% faster due to summary endpoint and eliminated duplicate calls
- **API Response Times**: Reduced by ~90% for batch queries vs N+1 queries
- **Network Traffic**: Reduced by ~80% for dashboard page (summary endpoint)
- **Dashboard API Optimization** (Latest): Removed unnecessary `/api/sessions` call (~700ms saved)
  - Dashboard now only calls `/api/groups` and `/api/sessions/summary` in parallel
  - Total dashboard load time improved from ~1800ms to ~500ms (~72% faster)
  - Parallel API calls reduce sequential wait time

### UI/UX Improvements
- **Group Selection UI**: Improved group selection when creating session from group page
  - Subtle badge above title instead of large card
  - Group automatically selected and locked when coming from group page
  - No group selector dropdown when group is locked
  - Cleaner, less intrusive UI
- **Simplified Singles Game Recording**: Streamlined UI for singles mode
  - Winner selection shows actual player names instead of "Team A" / "Team B"
  - Score labels show player names instead of team labels
  - More intuitive for 1v1 gameplay
- **Tab Switching Optimization**: Instant tab switching with no unnecessary refreshes
  - Tab clicks only change UI state, no API calls
  - Data already loaded and cached in component state
  - Much better UX with instant transitions

### Fixed
- **localStorage Sync**: Fixed issue where deleted sessions reappeared after refresh
  - Deleted sessions now removed from localStorage immediately
  - localStorage synced with API data on load (removes stale sessions)
  - API is source of truth, localStorage is fallback
- **Navigation Refresh**: Fixed "first click does nothing" issue with New Session button
  - Pathname effect now only refreshes when returning TO page, not when navigating away
  - Prevents refresh interference with Link navigation
- **Aggressive Auto-Refresh**: Removed unnecessary refreshes on tab/window switches
  - Removed visibility/focus event handlers that triggered on every switch
  - Data now refreshes only when needed (on mount, returning from create-session, explicit refresh)
  - Much better performance and UX

## [Unreleased] - 2024-12-XX

### Added
- **Singles Mode Support**: Added toggle to switch between doubles and singles gameplay modes. Singles mode supports 2-6 players with 1v1 matchups.
- **Default Player Names**: Players without names automatically get default names (Player 1, Player 2, etc.).
- **Multiple Sessions Support**: Home page now displays all created sessions, allowing users to switch between different sessions.
- **Session Name Default**: Session name automatically defaults to the formatted date if not provided.
- **Auto-Select Last Player**: In 4-player doubles mode, the last player is automatically selected when 3 players are chosen.
- **Flexible Session Creation**: Can now start sessions without entering all player names - defaults are assigned automatically.

### Fixed
- **Long Player Names**: Fixed text truncation issue in summary screen - player names now wrap properly and display fully.
- **Table Layout**: Fixed left-side text clipping in summary table by removing negative margins and improving table structure.
- **Column Alignment**: Fixed header and cell alignment inconsistencies in summary table.
- **Mobile UI**: Removed floating action button that blocked screen on mobile. Record game functionality is now accessible via bottom tab navigation.
- **Multiple Sessions Display**: Fixed issue where only one session was visible. All sessions are now stored and displayed on the home page.
- **Validation Logic**: Fixed validation to allow session creation with default player names instead of requiring all names to be entered.

### Changed
- **Mobile Navigation**: Replaced floating action button with bottom tab navigation for better mobile UX.
- **Session Management**: Sessions are now stored in a list, allowing users to create and manage multiple sessions.
- **Game Mode Architecture**: Refactored to support both doubles and singles modes while maintaining code scalability and reusability.
- **Summary Screen UI**: Improved table layout, spacing, and visual hierarchy. Better contrast for positive net values (green instead of accent color).
- **Shareable Text Display**: Changed from `<pre>` to styled `<div>` to avoid looking editable, added border for clarity.
- **Action Buttons**: Improved spacing and separation between primary and destructive actions on summary screen.
- **Player Input Placeholders**: Simplified from "Player 1 name (default: Player 1)" to just "Player 1" for cleaner UI.
- **Organizer Selection**: Auto-selects first player as organizer if none selected when creating session.

## [Unreleased] - 2024-12-15

### Fixed
- **Round Robin Game Generation**: Fixed bug where 4 players could only generate 3 games. Now properly supports custom game counts by repeating unique pairings when needed.
- **Upcoming Games Display**: Fixed limit showing only 3-5 games. Now displays up to 10 upcoming games in the Stats tab.
- **Game Creation Bug**: Fixed `gameNumber` calculation to use functional setState, preventing stale closure issues when adding games rapidly.
- **Round Robin Race Condition**: Fixed race condition when creating sessions with round robin games by properly handling initial games in `setSession`.
- **History Tab**: Fixed to only show played games (removed confusing unplayed round robin games from history).

### Added
- **Next Game Section**: Added prominent "Next Game" card on Stats tab showing the first unplayed round robin game with "Record Now" button.
- **Upcoming Games Section**: Added "Upcoming Games" section on Stats tab showing next 10 scheduled games for time planning.
- **Scheduled Games in Record Tab**: Added list of all scheduled games in Record tab that can be clicked to pre-fill the form.
- **Game Pre-filling**: QuickGameForm now supports pre-filling teams from scheduled games, making it easy to record round robin games.
- **Default Values**: All financial fields (court cost, bird cost, bet per player) now default to 0 if left empty.
- **Round Robin Game Count Input**: Added input field to specify exact number of round robin games to generate.
- **View All Schedule**: Added "View All" link when there are more scheduled games than displayed.

### Changed
- **Better UX for Round Robin Games**: Scheduled games are now clearly separated from played games. History tab only shows completed games.
- **Improved Game Recording**: When recording a scheduled game, teams are pre-filled and locked, only requiring winner selection and scores.

### UI/UX Improvements
- Clear visual hierarchy: "Next Game" is prominent, "Upcoming Games" is secondary
- Compact, scannable design for upcoming games list
- Each upcoming game has "Use" button for quick access
- Better separation between scheduled vs played games

