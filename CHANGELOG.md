# Changelog

## [Unreleased] - 2024-12-XX

### Added
- **Singles Mode Support**: Added toggle to switch between doubles and singles gameplay modes. Singles mode supports 2-6 players with 1v1 matchups.
- **Default Player Names**: Players without names automatically get default names (Player 1, Player 2, etc.).
- **Multiple Sessions Support**: Home page now displays all created sessions, allowing users to switch between different sessions.
- **Session Name Default**: Session name automatically defaults to the formatted date if not provided.
- **Auto-Select Last Player**: In 4-player doubles mode, the last player is automatically selected when 3 players are chosen.

### Fixed
- **Long Player Names**: Fixed text truncation issue in summary screen - player names now wrap properly and display fully.
- **Mobile UI**: Removed floating action button that blocked screen on mobile. Record game functionality is now accessible via bottom tab navigation.
- **Multiple Sessions Display**: Fixed issue where only one session was visible. All sessions are now stored and displayed on the home page.

### Changed
- **Mobile Navigation**: Replaced floating action button with bottom tab navigation for better mobile UX.
- **Session Management**: Sessions are now stored in a list, allowing users to create and manage multiple sessions.
- **Game Mode Architecture**: Refactored to support both doubles and singles modes while maintaining code scalability and reusability.

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

