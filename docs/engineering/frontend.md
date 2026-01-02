# Frontend Documentation

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React useState/useContext

## Design System

**See `docs/engineering/design-system.md` for the complete design style guide.**

### Visual Style
- **Japandi / Scandinavian Minimal**: Warm, cozy, airy aesthetic
- **Color Palette**: Warm off-white backgrounds (`#F7F2EA`), camel/wood accents (`#D3A676`)
- **Typography**: Clean, soft sans-serif (Inter, SF Pro, Nunito) with generous line height
- **Components**: Rounded cards (16-24px radius), soft shadows, minimal borders

### Principles
- **Mobile-first**: Designed for use at the badminton court
- **Clean & Simple**: Focus on usability and clarity with lots of whitespace
- **Fast Interactions**: Quick game logging without interrupting play
- **Visual Feedback**: Clear indicators for wins/losses, amounts, etc.
- **Warm & Cozy**: Avoid clinical or harsh designs; maintain calm, airy feeling

### Styling Approach
- Tailwind CSS utility classes for rapid development
- Japandi color palette defined in `tailwind.config.ts`
- Component-based architecture for reusable UI elements
- All components should follow the design system guidelines

### Implementation
- Colors available via Tailwind: `japandi-background-primary`, `japandi-accent-primary`, etc.
- Typography configured with proper font stack and line heights
- Custom shadows and border radius values for consistent styling

## Pages

### Home Page
- **Route**: `/`
- **Purpose**: Landing page with quick navigation
- **Components**: 
  - Welcome message
  - Navigation links to Dashboard and Create Session

### Dashboard Page
- **Route**: `/dashboard`
- **Purpose**: View and manage all sessions and groups
- **Components**:
  - Groups list with session counts
  - Standalone sessions list with search
  - Create Group and Quick Session buttons

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

### Group Page
- **Route**: `/group/[id]`
- **Purpose**: View group details, sessions, leaderboard, and player pool
- **Structure**: Tab navigation with 4 tabs
- **Components**:
  - **Sessions Tab**: List of all sessions in the group
    - Group Overview accordion (lazy loaded on first expand)
  - **Leaderboard Tab**: Ranked players by ELO rating
    - Player cards showing ELO, W/L, win rate, recent form
    - Click player to view detailed profile
  - **Pairings Tab**: Doubles partnerships ranked by win rate
  - **Players Tab**: Manage player pool

### Performance Optimizations

The Group Page uses lazy loading to minimize initial load time:

| Data | Load Strategy | Trigger |
|------|---------------|---------|
| Group info & Sessions | Eager | Page load |
| **Group Overview stats** | **Lazy** | **Accordion expand** |
| Leaderboard | Lazy | Tab click |
| Pairings | Lazy | Tab click |
| Players | Lazy | Tab click |
| Player/Pairing sheets | Lazy | Row click |

This reduces initial queries from 6 to 2, making page load nearly instant.

## Components

### Implemented Components
- `SessionHeader` - Session info, date, player count, summary button
- `LiveStatsCard` - Real-time W/L and gambling net display
- `QuickGameForm` - Game entry form with team selection
- `GameHistoryList` - Full game history with undo functionality
- `BottomTabNav` - Tab navigation (Stats, Record, History)
- `FloatingActionButton` - Quick record access from Stats tab
- `PlayerProfileSheet` - Detailed player stats modal (ELO, partners, opponents)

## Configuration

- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration

