# Key User Flows

## Flow 1: Create Session

**Status**: ✅ Implemented

**Steps:**
1. User navigates to `/create-session`
2. Fills out form:
   - Session name (optional)
   - Date/time
   - Add players (min 4, max 6)
   - Financial settings (court cost, bird cost, bet amount)
   - Select organizer
3. Submits form
4. App creates session object
5. Navigates to `/session/[id]` (Stats tab)

**Data Structures:**
- `Session` object created with unique ID
- Stored in SessionContext

---

## Flow 2: Log a Game

**Status**: ✅ Implemented

**Steps:**
1. User is on session page (Stats tab by default)
2. Option A: Taps FAB "Record Game" → Opens Record tab
3. Option B: Switches to Record tab
4. Selects Team A (2 players from list)
5. Selects Team B (2 players from list, different from Team A)
6. Selects winning team (Team A or Team B)
7. Taps "Save Game"
8. Game is added to session
9. Stats update in real-time
10. User sees success feedback
11. Can switch back to Stats tab to see updated stats

**Data Structures:**
- `Game` object created with:
  - `sessionId`
  - `gameNumber` (auto-incremented)
  - `teamA: [playerId, playerId]`
  - `teamB: [playerId, playerId]`
  - `winningTeam: "A" | "B"`

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
4. Sees mini game list (last 3-5 games)
5. Stats update automatically when games are logged

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
2. Sees full list of all games
3. Each game shows:
   - Game number
   - Team A players
   - Team B players
   - Winner
4. Can tap "Undo Last Game" to remove most recent game
5. Stats update after undo

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

## Flow 6: Undo Last Game

**Status**: ✅ Implemented

**Steps:**
1. User is on History tab
2. Taps "Undo Last Game" button
3. Confirmation dialog appears (optional)
4. Most recent game is removed
5. Stats recalculate automatically
6. User sees updated stats

**Data Changes:**
- Last game removed from games array
- Game numbers remain sequential
- All calculations rerun

