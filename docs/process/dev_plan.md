# Development Plan

## Phase 0 – Setup & Documentation

- [x] Create project folder and docs structure
- [x] Create initial documentation (vision, MVP spec, use cases)
- [x] Set up agent prompts and context files
- [x] Initialize Next.js project with TypeScript and Tailwind CSS
- [x] Create README.md at project root
- [x] Create basic app structure (home page, create-session placeholder)
- [x] Create TypeScript types for data model
- [x] Install dependencies and verify setup works

## Phase 1 – Project Foundation

- [x] Set up Next.js project structure
- [x] Configure Tailwind CSS
- [x] Set up basic routing structure
- [x] Create basic layout components
- [x] Set up TypeScript types for data model
- [x] Create SessionContext for state management
- [x] Implement calculation utilities

## Phase 2 – Session Creation

- [x] Create "Create Session" page
- [x] Implement session form:
  - [x] Session name input
  - [x] Date/time picker
  - [x] Add/remove players (min 4, max 6)
  - [x] Court cost input (per person or total)
  - [x] Bird cost input
  - [x] Bet per player input
  - [x] Organizer selection
- [x] Form validation
- [x] Navigate to live session page on submit
- [x] Store session state in memory

## Phase 3 – Live Session (Game Logging)

- [x] Create "Live Session" page with tab navigation
- [x] Display session info and player list (SessionHeader)
- [x] Implement Stats tab:
  - [x] Live stats cards (W/L and gambling net)
  - [x] Mini game list (last 3-5 games)
  - [x] Floating Action Button for quick record
- [x] Implement Record tab:
  - [x] Team A selection (2 players)
  - [x] Team B selection (2 players)
  - [x] Winner selection (Team A or Team B)
  - [x] Save game button
- [x] Implement History tab:
  - [x] Full game list
  - [x] Undo last game functionality
- [x] Real-time stats updates
- [x] Store games in session state

## Phase 4 – Summary & Calculations

- [x] Create "Summary" page
- [x] Implement calculation logic:
  - [x] Calculate wins/losses per player
  - [x] Calculate gambling net per player
  - [x] Calculate total shared costs
  - [x] Calculate even share per player
  - [x] Calculate fair total per player
  - [x] Calculate final amount to pay organizer
- [x] Display results table
- [x] Generate shareable text snippet
- [x] Copy-to-clipboard functionality

## Phase 5 – Polish & Testing

- [ ] Mobile-responsive design
- [ ] UI/UX improvements
- [ ] Error handling
- [ ] Manual testing checklist
- [ ] Fix any bugs
- [ ] Final polish

## Future Phases

- [ ] Player history & persistence
- [ ] Elo ratings
- [ ] Head-to-head stats
- [ ] Flexible settlement
- [ ] Multi-sport support
- [ ] Accounts & authentication
- [ ] AI helper features

