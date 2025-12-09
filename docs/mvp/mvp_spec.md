# MVP Specification

## MVP Goal

Build a minimal web app that lets a group of friends log badminton doubles games during a session and automatically calculates final money settlement. MVP focuses on **one screen to log games + one screen to show the money breakdown**.

## Target Users

Casual badminton groups who constantly forget who won how many games and who owes what.

## Core Features

### Feature 1: Create Session

**Description**: User creates a new badminton session with players and financial settings.

**Requirements**:
- Session name (optional)
- Date/time
- List of player names (min 4, max 6 for MVP; can hard-code 5)
- Financial settings:
  - Court cost: Option A - "per person" price (e.g., $14.40 per person) OR Option B - total court price (e.g., $72) and number of players to split across
  - Bird/shuttle cost total for the night (one number)
  - Toggle: "Bird cost shared equally across all players (including supplier)" → default ON
  - Per-game bet amount per player (e.g., $2)
- Select Organizer (one of the players)

**Assumptions**:
- Organizer is treated as if they prepaid all fixed costs (court + bird)
- Output only shows "how much each player should transfer to organizer"

**User Flow**:
1. User fills out form
2. On submit, navigates to "Live session" page

---

### Feature 2: Log Games During Session (Enhanced UX)

**Description**: Session page with bottom tab navigation for recording games, viewing live stats, and game history.

**UX Structure**:
- **Bottom Tab Navigation** with 3 tabs:
  1. **Stats Tab (Default)**: Shows live W/L and winnings, mini game list, FAB for quick record
  2. **Record Tab**: Full game entry form with team selection
  3. **History Tab**: Complete game list with undo/edit options

**Requirements**:
- **Session Header**: Session name, date, player count, "View Summary" button
- **Stats Tab**:
  - Live stats cards showing W/L and gambling net per player (real-time updates)
  - Mini game list (last 3-5 games)
  - Floating Action Button (FAB) for quick "Record Game" access
- **Record Tab**:
  - Quick game form:
    - Select Team A (2 players)
    - Select Team B (2 players)
    - Tap which team won
    - Save game
  - Recent teams quick-select (optional)
- **History Tab**:
  - Full list of all games: "Game 1: Darvey & Ronny def. James & Dayton"
  - Undo last game option
  - Edit game option (future)
- Real-time calculation updates after each game is saved

**Nice-to-have (not required for MVP)**: Quick preset for 5-player round robin rotation

**User Flow**:
1. User opens session page (defaults to Stats tab)
2. Sees live W/L and winnings immediately
3. Can tap FAB or switch to Record tab to log a game
4. After saving, stats update in real-time
5. Can view full history in History tab
6. Can undo last game if needed

---

### Feature 3: Automatically Compute Stats + Money

**Description**: From all logged games, app calculates wins/losses, gambling net, and final settlement.

**Requirements**:

**For each player:**
- Wins and losses count
- Gambling net:
  - For each game: Winners get +bet_per_player, Losers get -bet_per_player
  - Sum across all games → gambling_net[player]

**Costs:**
- Total shared cost = court_cost_total + bird_cost_total
  - If "per person" court cost: court_cost_total = per_person × #players
  - If "total" court cost: use given total
- Even share per player = total_shared_cost / #players

**Fair final out-of-pocket for each player:**
```
fair_total[player] = even_share_per_player - gambling_net[player]
```

**Since organizer prepaid everything:**
```
amount_to_pay_organizer[player] = fair_total[player]  (for non-organizers)
amount_to_pay_organizer[organizer] = 0
```

**Display:**
- Final table:
  | Player | Wins | Losses | Gambling net | Final amount to pay organizer |
  | ------ | ---- | ------ | ------------ | ----------------------------- |
  | ...    |      |        |              |                               |
- Shareable text snippet (copy to WhatsApp/Discord):
  ```
  Ronny → $15
  James → $17
  Dayton → $14
  Andrew → $13
  Darvey → $0
  ```

**User Flow**:
1. User taps "View Summary" button in session header
2. App calculates all stats automatically (using same calculation logic as live stats)
3. User sees final table and shareable text
4. User copies text and shares with group
5. Can return to session or create new session

---

## Data Model (MVP)

### Player
```typescript
{
  id: string
  name: string
}
```

### Session
```typescript
{
  id: string
  name?: string
  date: Date
  players: Player[]
  organizerId: string
  courtCostType: "per_person" | "total"
  courtCostValue: number
  birdCostTotal: number
  betPerPlayer: number
}
```

### Game
```typescript
{
  id: string
  sessionId: string
  gameNumber: number
  teamA: [playerId: string, playerId: string]
  teamB: [playerId: string, playerId: string]
  winningTeam: "A" | "B"
}
```

## Out of Scope

- Player authentication/accounts
- Persistence across sessions (MVP keeps state in memory)
- Elo ratings
- Head-to-head stats
- Multi-session history
- Flexible settlement (multiple prepayers)
- Multi-sport support
- AI helper features
- Round robin quick preset (nice-to-have, not required)

## Success Criteria

1. ✅ User can create a session with 4-6 players and financial settings
2. ✅ User can log games during the session (select teams, mark winner)
3. ✅ App automatically calculates wins/losses for each player
4. ✅ App automatically calculates gambling net for each player
5. ✅ App automatically calculates final settlement (who owes organizer how much)
6. ✅ User can see a clear table with all stats and amounts
7. ✅ User can copy/share a text snippet with final amounts
8. ✅ Works on mobile (responsive design)
9. ✅ No backend required (state in memory for MVP)

## Technical Constraints

- Single-page responsive web app
- Keep state in memory for MVP (no backend persistence)
- Clean, simple UI; mobile-first since people will use it at the court
- No authentication needed for MVP

