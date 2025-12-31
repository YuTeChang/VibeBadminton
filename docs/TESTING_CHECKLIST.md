# PoweredByPace Testing Checklist

## Pre-Testing Setup
- [ ] Dev server is running (`npm run dev`)
- [ ] Browser console is open to check for errors
- [ ] Clear browser localStorage before starting (to test fresh state)

## Core Feature Tests

### 1. Home Page
- [ ] Page loads without errors
- [ ] "PoweredByPace" title is visible
- [ ] Description text is readable
- [ ] "Create New Session" button is visible and clickable
- [ ] If session exists, "Active Session" card is displayed
- [ ] Active session card shows correct game count
- [ ] "Continue Session" button works (if session exists)
- [ ] Mobile responsive (test on mobile viewport)

### 2. Create Session Page

#### Form Fields
- [ ] Session name input accepts text (optional)
- [ ] Date picker works and defaults to today
- [ ] Can add players (4-6 players required)
- [ ] Can remove players (minimum 4)
- [ ] Player name inputs accept text
- [ ] Organizer dropdown populates with valid players
- [ ] Court cost toggle (Per Person / Total) works
- [ ] Court cost input accepts numbers (defaults to 0)
- [ ] Bird cost input accepts numbers (defaults to 0)
- [ ] Bet per player input accepts numbers (defaults to 0)
- [ ] Round robin checkbox works
- [ ] Round robin game count input appears when enabled
- [ ] Round robin game count accepts numbers

#### Validation
- [ ] Submit button is disabled with less than 4 players
- [ ] Submit button is disabled without organizer selected
- [ ] Error message shows "At least 4 players are required"
- [ ] Error message shows "Please select an organizer" when needed
- [ ] Invalid number inputs show error messages
- [ ] Invalid round robin count shows error message
- [ ] All validation messages are visible and readable

#### Round Robin
- [ ] Round robin checkbox enables/disables correctly
- [ ] Game count preview shows correct number
- [ ] Empty game count shows "all possible" games
- [ ] Custom game count is respected

#### Submission
- [ ] Form submits successfully with valid data
- [ ] Navigates to session page after submission
- [ ] Session is saved to localStorage
- [ ] Round robin games are created when enabled

### 3. Session Page - Stats Tab

#### Initial State
- [ ] Session header displays correctly
- [ ] Session name is shown (or "Badminton Session" if empty)
- [ ] Date is formatted correctly
- [ ] Player count is correct
- [ ] Bet per game is displayed
- [ ] "View Summary" button is visible
- [ ] "Back to Home" link works
- [ ] "End Session" button works (with confirmation)

#### Live Stats
- [ ] All players have stats cards
- [ ] Stats cards show player names
- [ ] W/L record is displayed (0-0 initially)
- [ ] Gambling net is displayed ($0.00 initially)
- [ ] Net amount is color-coded (positive/negative/neutral)
- [ ] Stats update in real-time after games are recorded

#### Next Game (Round Robin)
- [ ] "Next Game" card appears when round robin games exist
- [ ] Shows correct game number
- [ ] Shows correct team matchups
- [ ] "Record Now" button works
- [ ] Button navigates to Record tab with pre-filled teams

#### Upcoming Games
- [ ] "Upcoming Games" section appears when more than 1 scheduled game exists
- [ ] Shows up to 10 upcoming games
- [ ] Each game shows game number and teams
- [ ] "Use" button works for each game
- [ ] "View All" link appears when more than 11 games exist
- [ ] "View All" navigates to Record tab

#### Recent Games
- [ ] "Recent Games" section appears after games are played
- [ ] Shows last 5 played games
- [ ] Games are in reverse chronological order (newest first)
- [ ] Shows correct winner information

#### Empty States
- [ ] Empty state message appears when no games exist
- [ ] Message is helpful and clear

#### Floating Action Button
- [ ] FAB appears on Stats tab
- [ ] FAB is positioned correctly (bottom right)
- [ ] FAB navigates to Record tab when clicked
- [ ] FAB is visible on mobile

### 4. Session Page - Record Tab

#### Scheduled Games Section
- [ ] "Scheduled Games" section appears when round robin games exist
- [ ] Shows all unplayed scheduled games
- [ ] Each game shows game number and teams
- [ ] "Use This" button works
- [ ] Selected game is highlighted
- [ ] Selected game shows "Selected" button state
- [ ] Info message appears when game is selected

#### Team Selection
- [ ] Team A section is visible
- [ ] Team B section is visible
- [ ] Player buttons are clickable
- [ ] Selected players are highlighted
- [ ] Cannot select same player twice
- [ ] Cannot select player already in other team
- [ ] Teams are locked when using scheduled game
- [ ] Locked teams show disabled state

#### Winner Selection
- [ ] Winner buttons appear when teams are complete
- [ ] Team A button works
- [ ] Team B button works
- [ ] Selected winner is highlighted

#### Score Input
- [ ] Score inputs appear when teams are complete
- [ ] Team A score input accepts numbers
- [ ] Team B score input accepts numbers
- [ ] Scores are optional

#### Save Game
- [ ] Save button appears when form is valid
- [ ] Save button is disabled when form is invalid
- [ ] "Saving..." state appears during save
- [ ] Game is saved successfully
- [ ] Form resets after save
- [ ] Returns to Stats tab after save
- [ ] Stats update after save

#### Updating Scheduled Game
- [ ] Scheduled game can be updated (not duplicated)
- [ ] Teams remain locked when updating
- [ ] Only winner and scores can be changed
- [ ] Game moves from scheduled to played after update

### 5. Session Page - History Tab

#### Game List
- [ ] Only played games are shown (no scheduled games)
- [ ] Games are in reverse chronological order (newest first)
- [ ] Each game shows game number
- [ ] Each game shows winner information
- [ ] Scores are displayed if recorded
- [ ] Format is readable: "Team A def. Team B (21-19)"

#### Undo Functionality
- [ ] "Undo Last Game" button is visible
- [ ] Button works correctly
- [ ] Last game is removed
- [ ] Stats update after undo
- [ ] Game numbers remain sequential

#### Empty State
- [ ] Empty state message appears when no games
- [ ] Message directs user to Record tab

### 6. Summary Page

#### Navigation
- [ ] "View Summary" button navigates correctly
- [ ] "Back to Home" link works
- [ ] "Back to Session" link works
- [ ] "New Session" button works
- [ ] "End Session" button works (with confirmation)

#### Stats Table
- [ ] Table displays all players
- [ ] Player names are correct
- [ ] Organizer is marked with "(Organizer)"
- [ ] W/L records are correct
- [ ] Gambling net amounts are correct
- [ ] Net amounts are color-coded
- [ ] "Pay Organizer" amounts are correct
- [ ] Organizer shows $0.00 to pay
- [ ] Table is scrollable on mobile

#### Shareable Text
- [ ] Shareable text section is visible
- [ ] Text format is correct: "Player → $X"
- [ ] Amounts are formatted correctly
- [ ] Organizer shows $0
- [ ] "Copy" button works
- [ ] "Copied!" feedback appears
- [ ] Text can be copied to clipboard

#### Calculations
- [ ] Total shared costs are calculated correctly
- [ ] Even share per player is correct
- [ ] Fair total per player is correct (even share - gambling net)
- [ ] Final amounts to pay organizer are correct
- [ ] All calculations match expected values

### 7. Round Robin Feature

#### Game Generation
- [ ] Round robin games are generated correctly
- [ ] All players appear in games
- [ ] No duplicate pairings (when possible)
- [ ] Custom game count is respected
- [ ] All possible games generated when count is empty

#### Game Recording
- [ ] Scheduled games can be recorded
- [ ] Teams are pre-filled correctly
- [ ] Teams cannot be changed
- [ ] Game updates (not duplicates)
- [ ] Next game becomes available after recording

#### Game Display
- [ ] Scheduled games appear in Stats tab
- [ ] Scheduled games appear in Record tab
- [ ] Played games appear in History tab
- [ ] Clear separation between scheduled and played

### 8. Mobile Responsiveness

#### All Pages
- [ ] Text is readable on mobile (not too small)
- [ ] Buttons are large enough to tap (44px minimum)
- [ ] Forms are usable on mobile
- [ ] No horizontal scrolling (except tables)
- [ ] Bottom navigation is accessible
- [ ] Safe area insets work on notched devices

#### Touch Interactions
- [ ] Buttons respond to touch
- [ ] No double-tap zoom on buttons
- [ ] Active states provide feedback
- [ ] Scrollable areas work smoothly

### 9. Error Handling

#### Form Validation
- [ ] All validation errors are shown
- [ ] Error messages are clear and helpful
- [ ] Invalid inputs are highlighted
- [ ] Form cannot be submitted with errors

#### Edge Cases
- [ ] Empty session name works
- [ ] Zero costs work correctly
- [ ] Zero bets work correctly
- [ ] All players with same name (edge case)
- [ ] Very long player names (truncation)
- [ ] Special characters in names

### 10. State Management

#### localStorage
- [ ] Session persists after page refresh
- [ ] Games persist after page refresh
- [ ] Session clears when "End Session" is clicked
- [ ] New session replaces old session
- [ ] Games are filtered by session ID

#### State Updates
- [ ] Stats update immediately after game save
- [ ] No stale data appears
- [ ] All tabs show consistent data
- [ ] Summary page shows current data

## Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Performance
- [ ] Page loads quickly
- [ ] No console errors
- [ ] No memory leaks (check with DevTools)
- [ ] Smooth animations/transitions
- [ ] No lag when recording multiple games

## Accessibility
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] ARIA labels are present
- [ ] Screen reader compatible
- [ ] Color contrast is sufficient

## Known Issues
_List any bugs or issues found during testing:_

1. 
2. 
3. 

## Test Results Summary
- **Date**: ___________
- **Tester**: ___________
- **Browser**: ___________
- **Device**: ___________
- **Overall Status**: ⬜ Pass ⬜ Fail ⬜ Needs Work
- **Notes**: ___________

