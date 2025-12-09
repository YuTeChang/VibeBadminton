# Frontend Documentation

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React useState/useContext

## Design System

### Principles
- **Mobile-first**: Designed for use at the badminton court
- **Clean & Simple**: Focus on usability and clarity
- **Fast Interactions**: Quick game logging without interrupting play
- **Visual Feedback**: Clear indicators for wins/losses, amounts, etc.

### Styling Approach
- Tailwind CSS utility classes for rapid development
- Custom design tokens can be added to `tailwind.config.js` as needed
- Component-based architecture for reusable UI elements

### Future Enhancements
- Custom color palette and design tokens
- Component library (buttons, cards, forms)
- Animations and transitions
- Dark mode support
- Custom icons/illustrations

## Pages

### Home Page
- **Route**: `/`
- **Purpose**: Landing page, redirects to create session or shows recent sessions
- **Components**: 
  - Welcome message
  - "Create New Session" button
  - (Future: Recent sessions list)

### Create Session Page
- **Route**: `/create-session`
- **Purpose**: Form to create a new badminton session
- **Components**:
  - Session name input
  - Date/time picker
  - Player list (add/remove)
  - Financial settings form
  - Organizer selection
  - Submit button

### Live Session Page
- **Route**: `/session/[id]`
- **Purpose**: Log games, view live stats, and game history
- **Structure**: Bottom tab navigation with 3 tabs
- **Components**:
  - `SessionHeader` - Session info, date, player count, "View Summary" button
  - `BottomTabNav` - Tab navigation (Stats, Record, History)
  - **Stats Tab (Default)**:
    - `LiveStatsCard` - Real-time W/L and gambling net per player
    - `MiniGameList` - Last 3-5 games
    - `FloatingActionButton` - Quick "Record Game" access
  - **Record Tab**:
    - `QuickGameForm` - Team selection and winner input
    - Recent teams quick-select (optional)
  - **History Tab**:
    - `GameHistoryList` - Full game list with undo option

### Summary Page
- **Route**: `/session/[id]/summary`
- **Purpose**: Show final stats and money settlement
- **Components**:
  - Stats table (Wins, Losses, Gambling Net, Final Amount)
  - Shareable text snippet
  - Copy-to-clipboard button
  - "New Session" button

## Components

### Implemented Components
- `SessionHeader` - Session info, date, player count, summary button
- `LiveStatsCard` - Real-time W/L and gambling net display
- `QuickGameForm` - Game entry form with team selection
- `GameHistoryList` - Full game history with undo functionality
- `BottomTabNav` - Tab navigation (Stats, Record, History)
- `FloatingActionButton` - Quick record access from Stats tab

## Configuration

- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration

