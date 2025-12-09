# Use Cases

## Personas

### Casual Badminton Player (Darvey)
- **Background**: Plays badminton doubles with friends 2-3 times per week. Usually the organizer who books courts and buys birds.
- **Goals**: 
  - Track games without interrupting play
  - Know exactly who owes what at the end
  - Avoid awkward money conversations
- **Pain Points**: 
  - Forgets who won which games
  - Has to manually calculate everyone's share
  - Sometimes forgets to collect money

### Regular Player (Ronny, James, etc.)
- **Background**: Part of the same badminton group. Plays regularly but doesn't organize.
- **Goals**: 
  - See their win/loss record for the night
  - Know exactly how much to pay
  - Track their performance over time (future)
- **Pain Points**: 
  - Not sure if they're calculating their share correctly
  - Want to see their stats but don't want to manually track

## Use Cases

### Use Case 1: Create and Run a Session

**Persona**: Darvey (Organizer)

**Scenario**: Darvey and 4 friends are at the badminton court. They want to track games and settle money at the end.

**Steps**:
1. Darvey opens the app
2. Creates a new session
3. Enters session name (optional, e.g. "Friday Night Session")
4. Sets date/time
5. Adds player names: Darvey, Ronny, James, Dayton, Andrew
6. Selects himself as organizer
7. Enters financial settings:
   - Court cost: $14.40 per person (or $72 total)
   - Bird cost: $3.00 total
   - Bet per player per game: $2.00
8. Starts the session

**Expected Outcome**: Session is created and ready to log games.

---

### Use Case 2: Log Games During Play

**Persona**: Any player

**Scenario**: During the session, players want to quickly log each game without interrupting play.

**Steps**:
1. After each game, someone opens the app
2. Sees the live session page with list of players
3. For the new game:
   - Selects Team A (2 players, e.g., Darvey & Ronny)
   - Selects Team B (2 players, e.g., James & Dayton)
   - Taps which team won (e.g., Team A)
   - Saves game
4. Game appears in running list: "Game 1: Darvey & Ronny def. James & Dayton"

**Expected Outcome**: Game is logged and visible in the running list. Stats update automatically.

---

### Use Case 3: View Final Settlement

**Persona**: All players

**Scenario**: At the end of the session, everyone wants to see who owes what.

**Steps**:
1. Someone navigates to the summary page
2. App automatically calculates:
   - Each player's wins and losses
   - Gambling net (wins - losses) × bet amount
   - Shared costs (court + birds) split evenly
   - Final amount each player should pay organizer
3. Views the table showing:
   - Player | Wins | Losses | Gambling Net | Final Amount to Pay
4. Copies the shareable text snippet:
   ```
   Ronny → $15
   James → $17
   Dayton → $14
   Andrew → $13
   Darvey → $0
   ```
5. Shares via WhatsApp/Discord

**Expected Outcome**: Clear breakdown of who owes what. Easy to share with the group.

---

### Use Case 4: Quick Game Logging (Future)

**Persona**: Any player

**Scenario**: For 5-player round robin, players want a quick preset to rotate teams.

**Steps**:
1. Taps "Quick Rotation" button
2. App suggests next team combination based on previous games
3. Confirms and logs game

**Expected Outcome**: Faster game logging for round robin play.

