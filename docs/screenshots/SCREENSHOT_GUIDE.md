# Screenshot Guide

## How to Capture Screenshots

### Prerequisites
1. Development server running: `npm run dev`
2. Browser with developer tools or a screenshot extension
3. Sample data prepared (optional, for populated screenshots)

### Pages to Capture

#### 1. Home Page (`/`)
- **File**: `01-home-page.png`
- **What to show**: 
  - App title and description
  - Active session card (if exists)
  - "Create New Session" button

#### 2. Create Session Page (`/create-session`)
- **File**: `02-create-session-page.png`
- **What to show**:
  - Full form with all fields visible
  - Session name, date, players, organizer, costs, bets

#### 3. Session Page - Stats Tab (`/session/[id]`)
- **File**: `03-session-page-stats.png`
- **What to show**:
  - Session header
  - Live stats cards for all players
  - Recent games list
  - Bottom tab navigation
  - Floating action button

#### 4. Session Page - Record Tab (`/session/[id]` - Record tab)
- **File**: `04-session-page-record.png`
- **What to show**:
  - Game entry form
  - Team A and Team B selection
  - Winner selection
  - Score inputs (optional)
  - Save button

#### 5. Session Page - History Tab (`/session/[id]` - History tab)
- **File**: `05-session-page-history.png`
- **What to show**:
  - Full game history list
  - Undo last game button
  - All logged games with results

#### 6. Summary Page (`/session/[id]/summary`)
- **File**: `06-summary-page.png`
- **What to show**:
  - Final summary table
  - Player stats (W/L, Net, Amount to Pay)
  - Shareable text section
  - Copy button
  - Action buttons (Back to Session, New Session)

### Using Browser DevTools

1. Open the page in Chrome/Edge
2. Press `F12` to open DevTools
3. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
4. Type "screenshot" and select:
   - "Capture full size screenshot" for full page
   - "Capture node screenshot" for specific element
5. Save to `docs/screenshots/` with the appropriate filename

### Using Browser Extensions

Recommended extensions:
- **Full Page Screen Capture** (Chrome/Edge)
- **Awesome Screenshot** (Chrome/Edge)
- **FireShot** (Chrome/Edge/Firefox)

### Screenshot Settings

- **Format**: PNG (for best quality)
- **Resolution**: Full page (scroll to capture everything)
- **Browser Size**: 1280x720 or 1920x1080 for desktop
- **Mobile**: Use responsive design mode (375x667 for iPhone)

### Tips

1. **Clear browser cache** before taking screenshots to ensure latest styles
2. **Use incognito mode** to avoid extensions interfering
3. **Wait for animations** to complete before capturing
4. **Scroll to top** before taking full-page screenshots
5. **Use sample data** that looks realistic and showcases features

### Sample Data for Screenshots

For populated screenshots, use this sample session:
- **Session Name**: "Friday Night Session"
- **Players**: Alice, Bob, Charlie, Diana
- **Organizer**: Alice
- **Court Cost**: $14.40 per person
- **Bird Cost**: $3.00
- **Bet**: $2.00 per player per game
- **Games**: Log 3-5 sample games with different winners

### After Capturing

1. Review screenshots for quality
2. Ensure warm background color is visible (#F7F2EA)
3. Check that all UI elements are clearly visible
4. Verify text is readable
5. Add screenshots to git: `git add docs/screenshots/*.png`
6. Commit: `git commit -m "docs: Add screenshots of all pages"`
7. Push: `git push origin main`

