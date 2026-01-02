# Statistics Guide

This document explains all statistics displayed in the PoweredByPace app, how they're calculated, and how to interpret them.

## Table of Contents

1. [Player Overview Stats](#player-overview-stats)
2. [Player Detailed Stats](#player-detailed-stats)
3. [Group Overview Stats](#group-overview-stats)
4. [Pairing Stats](#pairing-stats)

---

## Player Overview Stats

These are the basic stats shown on the group page for each player.

### ELO Rating

**What it is:** A numerical rating that represents a player's skill level.

**How it's calculated:**
- All players start at 1500 ELO
- After each game, the winner gains points and the loser loses points
- The amount gained/lost depends on the expected outcome:
  - Beating a higher-rated player = more points gained
  - Losing to a lower-rated player = more points lost
- In doubles, the team's ELO is the average of both players

**How to read it:**
- `> 1600`: Above average player
- `1450-1550`: Average player
- `< 1400`: Below average or newer player

### Win Rate

**What it is:** The percentage of games won.

**Calculation:** `(Wins / Total Games) × 100`

**How to read it:**
- `≥ 60%`: Strong player (shown in green)
- `40-59%`: Average player
- `< 40%`: Struggling (shown in red)

### Games Played

**What it is:** Total number of games a player has participated in.

**Note:** A higher game count makes other stats more reliable.

---

## Player Detailed Stats

Tap on a player to see their detailed profile.

### Overview Section

| Stat | Description |
|------|-------------|
| **Record** | Win-Loss record (e.g., "15-8") |
| **Win %** | Same as win rate, shown as percentage |
| **ELO** | Current ELO rating |

### Current Streak

**What it is:** The number of consecutive wins or losses from the player's most recent game.

**How it's calculated:**
- Starts from the most recent game
- Counts consecutive wins (positive) or losses (negative)
- Stops counting as soon as the pattern breaks

**Display:**
- `🔥 3 game win streak` = Won last 3 games
- `😢 2 game losing streak` = Lost last 2 games

**Example:** If recent games are W, W, L, W, W (newest first), the current streak is **+2** (2 wins).

### Best Win Streak

**What it is:** The longest consecutive winning streak ever achieved.

**How it's calculated:** Tracks the maximum number of wins in a row throughout all games.

### Recent Form

**What it is:** A visual representation of the last 5-10 games.

**Display:** Shows W/L for each game, most recent first.

**Example:** `W W L W L` = Won most recent, won second most recent, lost third, etc.

---

## Close Games Section

The Close Games section shows games decided by narrow margins (1-2 points). These are split into two categories:

### Clutch Games 🎯

**What it is:** Games **won** by a narrow margin (1-2 points).

**Why it matters:** Shows when you came through in pressure situations. Clutch wins demonstrate the ability to close out tight games.

**Display:** 
- Green tile showing total count
- Tap to expand and see the specific games with scores and dates

### Unlucky Games 💔

**What it is:** Games **lost** by a narrow margin (1-2 points).

**Why it matters:** Shows games that could have gone either way - these close losses indicate competitive play even though they resulted in a loss. A high unlucky count alongside a low win rate might suggest you're competitive but need to work on closing out games.

**Display:** Tap to expand and see the specific games with scores and dates.

---

## Partners Section (Doubles)

Shows statistics for playing alongside each partner.

### Partner List

- **Sorted by:** Win rate (highest first)
- **Display:** Shows W-L record, games played, and win rate
- **Show All:** Tap "Show All" to see all partners (default shows top 3)

### Partner Callouts

| Callout | Criteria | Meaning |
|---------|----------|---------|
| 🔥 **Hot duo with [Name]** | Win rate ≥ 70% and ≥ 3 games | You play very well together |
| ⚠️ **Struggles with [Name]** | Win rate < 40% and ≥ 3 games | Partnership needs work |

**Note:** Callouts only appear after 3+ games to ensure statistical significance.

---

## Opponents Section

Shows head-to-head statistics against each opponent.

### Opponent List

- **Sorted by:** Win rate against them (highest first)
- **Display:** Shows W-L record, games played, and win rate
- **Show All:** Tap "Show All" to see all opponents (default shows top 3)

### Opponent Callouts

| Callout | Criteria | Meaning |
|---------|----------|---------|
| 💪 **Dominates vs [Name]** | Win rate ≥ 70% and ≥ 3 games | You consistently beat this player |
| 😰 **Nemesis: [Name]** | Win rate < 30% and ≥ 3 games | This player consistently beats you |

**Note:** Callouts only appear after 3+ games to ensure statistical significance.

---

## Group Overview Stats

Found in the expandable "Group Overview" section on the group page.

> **Performance Note**: Group Overview stats are **lazy loaded** - they only fetch from the database when you expand the accordion. This keeps the group page fast to load initially.

### Basic Stats

| Stat | Description |
|------|-------------|
| **Total Games** | All games played in the group |
| **Total Sessions** | Number of play sessions |
| **Total Players** | Number of players in the group |
| **Games/Session** | Average games per session |
| **Point Differential** | Average winning margin |
| **Days Active** | Days since first session |

### Individual Records

If multiple players are tied for a record, all tied players are shown with a "(tie)" indicator.

#### Highest ELO 👑

**What it is:** Player(s) with the highest current ELO rating.

**Note:** This indicates the most skilled player based on competitive performance.

#### ELO Spread

**What it is:** Difference between highest and lowest ELO in the group.

**How to read it:**
- `< 200`: Competitive, balanced group
- `200-400`: Some skill disparity
- `> 400`: Significant skill gaps

#### Best Win Streak 🔥

**What it is:** The longest consecutive win streak achieved by any player.

#### Most Games Played 🎯

**What it is:** Player who has participated in the most games.

### Pair Records

These mirror the individual records but track partnerships instead. If multiple pairs are tied for a record, all tied pairs are shown with a "(tie)" indicator.

#### Highest Pair ELO 👑

**What it is:** The partnership(s) with the highest combined ELO rating.

**How it's calculated:** Each pair has their own ELO that updates when they play together.

**Criteria:** Only pairs with 3+ games together are considered.

#### Best Pair Streak 🔥

**What it is:** The partnership(s) with the longest consecutive win streak together.

**How it's calculated:** Tracks the maximum number of wins in a row the pair achieved while playing as teammates.

**Criteria:** Only pairs with 3+ games together are considered.

#### Most Games Together 💪

**What it is:** The partnership(s) that have played the most games as teammates.

**Why it matters:** Shows the most consistent/frequent partnerships in the group.

**Criteria:** Only pairs with 3+ games together are considered.

### Clutch Stats 🎯

#### Clutch Player

**What it is:** Player with the most games won by narrow margins (1-2 points).

**Why it matters:** Shows who performs best under pressure - players who can close out tight games when it matters most.

#### Clutch Pairing

**What it is:** The partnership with the most narrow wins together.

**Why it matters:** A duo that consistently wins the close ones, demonstrating composure under pressure.

### Unlucky Stats 💔

#### Unluckiest Player

**What it is:** Player with the most games lost by narrow margins (1-2 points).

**Why it matters:** Shows who has had the most "almost wins" - players who compete closely but often just miss victory.

#### Unluckiest Pairing

**What it is:** The partnership with the most narrow losses together.

**Why it matters:** A duo that plays competitively but struggles to close out tight games.

### Pair Stats

#### Dream Team

**What it is:** The partnership with the highest win rate.

**Display:** `Player A & Player B (W-L)` with win rate percentage.

**Criteria:** Must have played 3+ games together. Shows wins-losses record.

#### Closest Rivalry ⚔️

**What it is:** The matchup between two pairs that is most evenly matched.

**How it's calculated:**
- Tracks all pair vs pair matchups (e.g., A&B vs C&D)
- Finds the matchup closest to a 50-50 split
- Example: A&B vs C&D with 12-11 record (closer than 8-3)

**Display:** Shows both pairs and their head-to-head record (e.g., "12-11 (23 games)").

**Criteria:** Only pairs who have played each other **3+ times** are considered. This ensures some statistical significance while still showing rivalries early.

**Why you might not see it:** If no two pairs in your group have faced each other 3+ times, this stat won't appear. This is common in smaller groups or groups that rotate players frequently.

---

## Pairing Stats (Deep Dive)

Tap on a partnership in the Group Overview to see detailed pairing statistics.

### Overview

| Stat | Description |
|------|-------------|
| **Record** | Win-Loss record as partners |
| **Win Rate** | Percentage of games won together |
| **Current Streak** | Consecutive wins/losses as a team |
| **Avg Point Diff** | Average point differential in games |

### vs Other Pairs

Shows head-to-head records against every other partnership you've faced.

| Stat | Description |
|------|-------------|
| **Record** | Games won vs lost against that pair |
| **Win Rate** | Win percentage against that pair |

---

## How ELO Changes After a Game

The ELO system uses this formula:

```
K = 32 (constant for adjustment speed)
Expected = 1 / (1 + 10^((OpponentELO - YourELO) / 400))
Change = K × (Actual - Expected)
```

**Examples:**
- You (1500) beat opponent (1500): +16 ELO
- You (1500) beat opponent (1600): +24 ELO (beating better player)
- You (1500) lose to opponent (1400): -24 ELO (losing to weaker player)

**In doubles:** Team ELO is averaged. Both partners gain/lose the same amount.

---

## Statistical Significance

**Why minimums matter:** Many callouts require 3+ games because:
- Single games can be fluky
- Small sample sizes are unreliable
- 3+ games provide a better picture of true performance

**When to trust stats:**
- `< 5 games`: Take with a grain of salt
- `5-10 games`: Getting reliable
- `> 10 games`: Good statistical confidence

---

## Tips for Using Stats

1. **Don't obsess over ELO** - It's a measure of competitive performance, not overall skill
2. **Context matters** - A 40% win rate against the best player might be impressive
3. **Streaks end** - Current streak is just recent form, not predictive
4. **Partners matter** - Your success in doubles depends heavily on synergy
5. **Unlucky games happen** - Narrow losses show competitive play, not failure

---

## Changelog

- **2024-01**: Added unlucky stats (player and pairing)
- **2024-01**: Fixed current streak calculation to only count consecutive from most recent game
- **2024-01**: Added Show All for partners/opponents lists
- **2024-01**: Dream Team now shows W-L record instead of just games count
