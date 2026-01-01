# Key User Flows

## Flow 1: Create Session

**Status**: ✅ Implemented

**Steps:**
1. User navigates to `/create-session`
2. Fills out form:
   - Session name (optional)
   - Date/time
   - Add players (min 4, max 6)
   - Financial settings (court cost, bird cost, bet amount) - all default to 0 if empty
   - Select organizer
   - Optional: Enable Round Robin Schedule
     - If enabled: Specify number of games (or leave empty for all possible games)
3. Submits form
4. App creates session object
5. If round robin enabled: Games are pre-created with `winningTeam: null`
6. Navigates to `/session/[id]` (Stats tab)

**Data Structures:**
- `Session` object created with unique ID
- If round robin: `Game` objects created with teams set, `winningTeam: null`
- Stored in SessionContext and localStorage

---

## Flow 2: Log a Game

**Status**: ✅ Implemented

**Steps:**
1. User is on session page (Stats tab by default)
2. Option A: Taps FAB "Record Game" → Opens Record tab
3. Option B: Switches to Record tab
4. Option C: Clicks "Record Now" on Next Game card → Opens Record tab with teams pre-filled
5. Option D: Clicks "Use" on a scheduled game in Record tab → Pre-fills teams
6. If teams are pre-filled from scheduled game:
   - Teams are locked (can't change)
   - Only need to select winner and optional scores
7. If manually creating game:
   - **Doubles Mode**: Selects Team A (2 players) and Team B (2 players)
   - **Singles Mode**: Selects Player 1 and Player 2 (simplified UI)
8. Selects winning team/player:
   - **Doubles Mode**: Shows "Team A" vs "Team B" buttons
   - **Singles Mode**: Shows actual player names (e.g., "John" vs "Jane")
9. Optionally adds scores
10. Taps "Save Game"
11. If updating scheduled game: Game is updated (winningTeam set, scores added)
12. If creating new game: New game is added to session
13. Stats update in real-time
14. User automatically returned to Stats tab
15. Can see updated stats

**Data Structures:**
- `Game` object created or updated with:
  - `sessionId`
  - `gameNumber` (auto-incremented)
  - `teamA: [playerId, playerId]`
  - `teamB: [playerId, playerId]`
  - `winningTeam: "A" | "B"` (null if scheduled, not yet played)
  - Optional: `teamAScore`, `teamBScore`

**Calculations Triggered:**
- Wins/losses per player
- Gambling net per player
- All stats recalculated

---

## Flow 3: View Live Stats

**Status**: ✅ Implemented

**Steps:**
1. User opens session page
2. Defaults to Stats tab
3. Sees live stats cards:
   - Each player's W/L record
   - Current gambling net (+$X or -$X)
4. Sees "Next Game" card (if round robin games exist):
   - Shows first unplayed scheduled game
   - Teams displayed
   - "Record Now" button to quickly record
5. Sees "Upcoming Games" section (if more scheduled games exist):
   - Shows next 10 scheduled games
   - Compact list format
   - Each game has "Use" button
   - "View All" link if more than 10 games
6. Sees "Recent Games" list (last 5 played games)
7. Stats update automatically when games are logged

**Data Displayed:**
- Player name
- Wins count
- Losses count
- Gambling net (formatted as currency)
- Visual indicators (green for positive, red for negative)

---

## Flow 4: View Game History

**Status**: ✅ Implemented

**Steps:**
1. User switches to History tab
2. Sees full list of all **played** games only (scheduled/unplayed games not shown)
3. Each game shows:
   - Game number
   - Winner team (e.g., "Alice & Bob def. Charlie & Diana")
   - Optional scores if recorded
4. Games displayed in reverse chronological order (newest first)
5. Can tap "Undo Last Game" to remove most recent game
6. Stats update after undo

**Data Changes:**
- Last game removed from games array
- Game numbers remain sequential
- All calculations rerun

---

## Flow 5: View Final Summary

**Status**: ✅ Implemented

**Steps:**
1. User taps "View Summary" button in session header
2. Navigates to `/session/[id]/summary`
3. App calculates final settlement:
   - Total shared costs (court + birds)
   - Even share per player
   - Fair total per player (even share - gambling net)
   - Final amount to pay organizer
4. Displays table with all stats
5. Generates shareable text snippet
6. User can copy text to clipboard
7. User can share via WhatsApp/Discord
8. Can return to session or create new session

**Calculations:**
```
totalSharedCost = courtCostTotal + birdCostTotal
evenSharePerPlayer = totalSharedCost / numPlayers
fairTotal[player] = evenSharePerPlayer - gamblingNet[player]
amountToPayOrganizer[player] = fairTotal[player] (for non-organizers)
amountToPayOrganizer[organizer] = 0
```

---

## Flow 6: Record Scheduled Round Robin Game

**Status**: ✅ Implemented

**Steps:**
1. User sees "Next Game" card on Stats tab or scheduled games in Record tab
2. Clicks "Record Now" or "Use" button
3. Record tab opens with teams pre-filled and locked
4. User selects winning team (Team A or Team B)
5. Optionally adds scores
6. Clicks "Save Game"
7. Scheduled game is updated (not duplicated)
8. `winningTeam` changes from `null` to `"A"` or `"B"`
9. Stats update in real-time
10. Returns to Stats tab
11. Next scheduled game becomes the new "Next Game"

**Key Difference:**
- Updates existing game object instead of creating new one
- Teams cannot be changed (pre-filled from schedule)
- Game moves from "scheduled" to "played" status

---

## Flow 7: View Scheduled Games

**Status**: ✅ Implemented

**Steps:**
1. User navigates to Record tab
2. Sees "Scheduled Games" section at top (if round robin games exist)
3. Sees list of all unplayed scheduled games
4. Each game shows:
   - Game number
   - Teams (Team A vs Team B)
   - "Use" button to pre-fill form
5. Can click "Use" on any scheduled game
6. Form pre-fills with that game's teams
7. Can then record the game result

**UX Benefits:**
- Easy to see all upcoming games
- Quick access to record any scheduled game
- Clear separation between scheduled and played games
