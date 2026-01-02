# Features Development Log

This document tracks all features, improvements, and fixes added to PoweredByPace.

## Latest Updates (2025-01)

### Major Features Added

#### Extended Stats System
- **Status**: ✅ Complete
- **Description**: Added streak tracking, pairing ELO, point differential, and group overview stats
- **Implementation**:
  - **Player Streaks**: Track `current_streak` and `best_win_streak` on `group_players`
    - Positive values = win streak, negative = loss streak
    - Shows 🔥 badge for 3+ win streak, ❄️ for 3+ loss streak on leaderboard
  - **Pairing ELO**: Independent ELO for each doubles pair (treats pair as single unit)
    - Starts at 1500, K-factor 32
    - Different from combining individual ELOs
  - **Pairing Point Differential**: Track `points_for` and `points_against` for pairs
  - **Pairing Streaks**: Track current and best win streaks for pairs
  - **Group Overview Stats**: New card showing total games, sessions, most active player, closest matchup
- **Database Migration**: `005-add-extended-stats.sql`
- **User Impact**: More meaningful stats, better competitive insights

#### Leaderboard Enhancements
- **Status**: ✅ Complete
- **Description**: Replaced ELO display with Recent Form, added streak badges
- **Implementation**:
  - Replaced ELO number with W/L boxes showing recent form (3 on mobile, 5 on desktop)
  - Added 🔥 (hot) and ❄️ (cold) streak badges next to player names
  - ELO still used internally for ranking, just hidden from UI
- **User Impact**: More intuitive at-a-glance view of player performance

#### Pairing Profile Enhancements
- **Status**: ✅ Complete
- **Description**: Added pairing ELO, point differential, and best streak to pairing profile sheet
- **Implementation**:
  - New stats row showing Pair ELO, Point Diff (+/-), Best Streak
  - Point differential shows green/red color based on positive/negative
- **User Impact**: Deeper insights into doubles pairing performance

#### Mobile Input Zoom Fix
- **Status**: ✅ Complete
- **Description**: Fixed iOS Safari auto-zoom when focusing on score input fields
- **Implementation**:
  - Added `text-base` (16px) class to all input fields
  - iOS zooms on inputs with font-size < 16px
- **User Impact**: Smoother mobile experience when recording game scores

#### ELO Rating & Leaderboard System
- **Status**: ✅ Complete
- **Description**: Track player skill with ELO ratings and view group leaderboards
- **Implementation**:
  - Added `elo_rating` column to `group_players` table (default: 1500)
  - Created `EloService` for rating calculations (K-factor: 32)
  - ELO updates automatically when games are completed
  - New "Leaderboard" tab on group pages showing ranked players
  - Player profiles with detailed statistics
    - Partner synergy (win rates by teammate)
    - Opponent matchups (win rates against each player)
    - Recent form (last 5 games as W/L indicators)
    - Current streak tracking
  - Created new API endpoints:
    - `GET /api/groups/[id]/stats` - Leaderboard data
    - `GET /api/groups/[id]/players/[id]/stats` - Player detailed stats
- **Database Migration**: `002-add-elo-rating.sql` (auto-applied on deploy)
- **User Impact**: Players can now track their skill progression and see who they pair well with

#### 1. Delete Functionality
- **Status**: ✅ Complete
- **Description**: Delete sessions and groups with confirmation dialogs
- **Implementation**:
  - Added delete buttons to dashboard session cards
  - Added delete button to group page header
  - Added delete button to session page header
  - All delete actions require confirmation
  - Proper cleanup of related data (cascade deletes)
- **User Impact**: Users can now clean up old sessions and groups they no longer need

#### 2. Search Functionality
- **Status**: ✅ Complete
- **Description**: Search standalone sessions by name on dashboard
- **Implementation**:
  - Added search input to dashboard page
  - Real-time filtering as user types
  - Case-insensitive substring matching
  - Only searches standalone sessions (not group sessions)
- **User Impact**: Users can quickly find sessions by name when they have many sessions

#### 3. Edit Session Functionality
- **Status**: ✅ Complete
- **Description**: Edit session name and date after creation
- **Implementation**:
  - Added "Edit Session" button on session page
  - Modal form for editing name and date
  - Updates session in database and context
- **User Impact**: Users can correct mistakes or update session information after creation

#### 4. API Optimization
- **Status**: ✅ Complete
- **Description**: Optimized API calls for better performance
- **Implementation**:
  - Created lightweight `/api/sessions/summary` endpoint
  - Eliminated duplicate API calls with smart caching
  - Fixed N+1 query problems with batch queries
  - Dashboard now uses summary endpoint instead of full sessions
  - Group session counts calculated from summaries (no extra API calls)
- **User Impact**: Faster dashboard loading, reduced server load, better user experience

#### 5. Home Page Refactor
- **Status**: ✅ Complete
- **Description**: Separated landing page from dashboard
- **Implementation**:
  - Home page (`/`) is now simple landing page with navigation
  - Dashboard page (`/dashboard`) contains all sessions and groups
  - Prevents expensive API calls on home page load
  - Better separation of concerns
- **User Impact**: Faster initial page load, cleaner navigation structure

#### 6. Betting Default Change
- **Status**: ✅ Complete
- **Description**: Betting now defaults to OFF for new sessions
- **Implementation**:
  - Changed default `bettingEnabled` from `true` to `false`
  - Users can still enable betting if desired
- **User Impact**: Better default for users who just want to track games without betting

#### 7. Dashboard API Performance Optimization
- **Status**: ✅ Complete
- **Description**: Optimized dashboard API calls for faster loading
- **Implementation**:
  - Removed unnecessary `/api/sessions` call (was fetching full sessions with all players)
  - Parallelized `/api/groups` and `/api/sessions/summary` calls using `Promise.all()`
  - Added deduplication to prevent duplicate summary calls
  - Dashboard now manages groups locally instead of from context
- **Performance Impact**: 
  - Before: ~1800ms (700ms + 500ms + 300ms sequential)
  - After: ~500ms (max of 500ms and 300ms parallel)
  - **~72% faster load time (~1000ms improvement)**
- **User Impact**: Dashboard loads much faster, better user experience

#### 8. Manual Deployment Control
- **Status**: ✅ Complete
- **Description**: Changed deployment strategy to manual control with `[deploy]` keyword
- **Implementation**:
  - Updated Vercel `ignoreCommand` to check for `[deploy]` in commit message
  - Default behavior: all commits skip deployment
  - Only deploys when `[deploy]` keyword is present in commit message
- **Workflow**:
  - Regular commits: `git commit -m "Update docs"` → no deployment
  - Deploy commits: `git commit -m "Fix bug [deploy]"` → triggers deployment
- **User Impact**: Full control over deployments, can test locally before deploying

#### 9. UI/UX Improvements (Group Selection & Singles Recording)
- **Status**: ✅ Complete
- **Description**: Improved UI/UX for group sessions and singles game recording
- **Implementation**:
  - **Group Selection**: Subtle badge above title when creating from group page
    - Group automatically selected and locked when `groupId` is in URL
    - No large card taking up space
    - Cleaner, less intrusive design
  - **Singles Game Recording**: Simplified UI for singles mode
    - Winner selection shows actual player names (e.g., "John" vs "Jane")
    - Score labels show player names instead of "Team A" / "Team B"
    - More intuitive for 1v1 gameplay
- **User Impact**: Better UX, cleaner interface, more intuitive for singles games

#### 10. Performance Optimizations (Tab Switching & Refresh)
- **Status**: ✅ Complete
- **Description**: Optimized tab switching and data refresh behavior
- **Implementation**:
  - **Tab Switching**: Removed unnecessary refresh on tab click
    - Tab clicks only change UI state, no API calls
    - Data already loaded and cached in component state
    - Instant tab switching with no loading states
  - **Smart Refresh**: Fixed pathname effect to only refresh when returning to page
    - Only refreshes when navigating TO page, not when navigating away
    - Prevents refresh interference with Link navigation
    - Fixes "first click does nothing" issue
  - **Removed Aggressive Auto-Refresh**: Removed visibility/focus event handlers
    - No more refreshes when switching browser tabs/windows
    - Data refreshes only when needed (on mount, returning from create-session, explicit refresh)
- **Performance Impact**: 
  - Instant tab switching (no network calls)
  - No unnecessary refreshes on tab/window switches
  - Better UX with immediate UI updates
- **User Impact**: Much faster, smoother experience, no unnecessary loading states

#### 11. localStorage Sync Fix
- **Status**: ✅ Complete
- **Description**: Fixed issue where deleted sessions reappeared after refresh
- **Implementation**:
  - Deleted sessions now removed from localStorage immediately
  - localStorage synced with API data on load (removes stale sessions)
  - API is source of truth, localStorage is fallback
- **User Impact**: Deleted sessions no longer reappear, data stays in sync

### Previous Major Features (2024-12)

#### 1. Groups Feature
- **Status**: ✅ Complete
- **Description**: Organize recurring badminton groups with shareable links
- **Implementation**:
  - Added `groups` and `group_players` database tables
  - Created group service layer (`lib/services/groupService.ts`)
  - Added group API routes (`/api/groups/*`)
  - Created group pages (create, detail, shareable link)
  - Integrated group selection in session creation
  - Added player pool management per group
  - Player linking between sessions and group pool
- **User Impact**: Users can now organize recurring groups, share with friends, and track players across sessions

#### 2. Optional Betting Feature
- **Status**: ✅ Complete
- **Description**: Per-session betting toggle with conditional UI
- **Implementation**:
  - Added `bettingEnabled` field to Session type
  - Created `calculateNonBettingStats()` for universal stats
  - Updated summary page with conditional betting UI
  - Universal stats (win rate, points) always shown
  - Betting stats only shown when enabled
  - Updated shareable text generation
- **User Impact**: Users can use the app for stats tracking without betting, or enable betting when desired

#### 3. Cross-Session Stats
- **Status**: ✅ Complete
- **Description**: Aggregate player statistics across all sessions in a group
- **Implementation**:
  - Created stats service (`lib/services/statsService.ts`)
  - Player linking via `groupPlayerId` field
  - Stats aggregation across group sessions
  - Win rate, total games, points tracked
- **User Impact**: Users can see player performance over time within a group

### UI/UX Improvements

#### 4. Home Page Redesign
- **Status**: ✅ Complete
- **Description**: Show groups first, then standalone sessions
- **Changes**:
  - Groups displayed prominently at top
  - Standalone sessions shown separately
  - "Create Group" and "Quick Session" buttons
  - Group session counts displayed
- **User Impact**: Better organization, easier to find groups vs standalone sessions

#### 5. Summary Page Enhancement
- **Status**: ✅ Complete
- **Description**: Enhanced summary with universal stats and conditional betting
- **Changes**:
  - Universal stats always shown (W/L, Win %, Point Differential)
  - Betting stats conditionally shown (Net, Amount to Pay)
  - Cost breakdown section
  - Better table layout
- **User Impact**: Clearer stats display, works for both betting and non-betting sessions

## Previous Features (2024-12-XX)

### Singles Mode Support
- **Status**: ✅ Complete
- **Description**: Added full support for singles badminton gameplay (1v1 matches)
- **Implementation**:
  - Added `gameMode` field to Session type ("doubles" | "singles")
  - Updated QuickGameForm to support 1-player teams for singles
  - Modified roundRobin generator to create 1v1 matchups
  - Updated all display components to handle both modes
  - Maintained backward compatibility (defaults to doubles)

### Multiple Sessions Management
- **Status**: ✅ Complete
- **Description**: Users can create and manage multiple sessions
- **Implementation**:
  - Extended SessionContext to store all sessions list
  - Updated home page to display all sessions
  - Added `loadSession` method to switch between sessions
  - Sessions persist in database and localStorage

### Default Player Names
- **Status**: ✅ Complete
- **Description**: Automatic default names for players without names
- **Implementation**:
  - Players without names get "Player 1", "Player 2", etc.
  - Validation updated to allow session creation without all names
  - Organizer auto-selects to first player if none chosen

### Auto-Select Last Player
- **Status**: ✅ Complete
- **Description**: In 4-player doubles mode, automatically selects last player when 3 are chosen
- **Implementation**:
  - Added useEffect in QuickGameForm to detect 3-of-4 selection
  - Automatically fills remaining slot

### Round Robin Scheduling
- **Status**: ✅ Complete
- **Description**: Generate scheduled game combinations
- **Features**:
  - Custom game count input
  - Next game highlighting
  - Upcoming games list
  - Pre-fill game form from schedule
  - Balanced breaks for 5-player setups

### Real-Time Stats
- **Status**: ✅ Complete
- **Description**: Live win/loss and gambling net tracking
- **Features**:
  - Per-player stats
  - Real-time updates
  - Visual indicators for positive/negative net

### Automatic Settlement Calculation
- **Status**: ✅ Complete
- **Description**: Automatic final money calculation
- **Features**:
  - Wins/losses per player
  - Gambling net calculation (when betting enabled)
  - Shared cost distribution
  - Final settlement amounts
  - Shareable text generation

## Architecture Decisions

### Groups Feature
- **Decision**: Groups are optional - sessions can be standalone or belong to a group
- **Rationale**: Flexibility for one-off sessions vs recurring groups
- **Implementation**: `groupId` nullable in sessions table

### Player Linking
- **Decision**: Link session players to group player pool via `groupPlayerId`
- **Rationale**: Track same player across sessions without requiring accounts
- **Implementation**: Optional `groupPlayerId` field in players table

### Optional Betting
- **Decision**: Per-session betting toggle, universal stats always shown
- **Rationale**: Support both betting and non-betting use cases
- **Implementation**: `bettingEnabled` boolean, conditional UI rendering

### Database Choice
- **Decision**: Use Supabase (PostgreSQL) for shared sessions
- **Rationale**: Easy setup, good free tier, PostgreSQL reliability
- **Implementation**: Service layer pattern with Supabase client

## Future Considerations

### Potential Enhancements
- User authentication (optional)
- ELO history and trend graphs
- Team suggestion AI (balance teams based on ELO)
- Export/import sessions
- Multi-sport support
- Advanced analytics dashboard
- Push notifications for game invites

## Technical Debt & Notes

- All sessions stored in database (Supabase) with localStorage fallback
- No user authentication (public access with shareable links)
- TypeScript strict mode enabled
- Mobile-first responsive design
- Backward compatibility maintained for existing sessions
