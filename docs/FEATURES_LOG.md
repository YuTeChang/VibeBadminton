# Features Development Log

This document tracks all features, improvements, and fixes added to PoweredByPace.

## Latest Updates (2025-01-XX)

### Major Features Added

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
- Elo ratings
- Player history across all sessions
- Team statistics
- Head-to-head matchups
- Export/import sessions
- Multi-sport support
- Advanced analytics dashboard

## Technical Debt & Notes

- All sessions stored in database (Supabase) with localStorage fallback
- No user authentication (public access with shareable links)
- TypeScript strict mode enabled
- Mobile-first responsive design
- Backward compatibility maintained for existing sessions
