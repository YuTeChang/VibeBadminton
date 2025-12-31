# PoweredByPace – AI Context / Instructions

**Purpose**: This file provides quick context for AI assistants working on this project.

---

## Project Overview

**PoweredByPace** is a tiny web/mobile app that helps groups of friends track their badminton doubles games during a session and automatically calculates wins/losses, gambling results, shared costs, and final "who owes who how much" at the end of the night.

**Tech Stack**: Next.js 14, TypeScript, Tailwind CSS (no backend for MVP)

**Project Root**: `/Users/yute.chang/code/PoweredByPace`

---

## Source of Truth Documents

**Product & Vision:**
- `docs/vision/product_vision.md` - Long-term vision and goals
- `docs/vision/use_cases.md` - User personas and scenarios
- `docs/mvp/mvp_spec.md` - MVP requirements and data model

**Process & Planning:**
- `docs/process/dev_plan.md` - Current roadmap and task checklist
- `docs/process/progress_log.md` - Dated log of work
- `docs/process/decisions.md` - Important decisions
- `docs/process/ai_context.md` - This file

**Engineering:**
- `docs/engineering/system_overview.md` - Architecture (to be created)
- `docs/engineering/frontend.md` - Frontend structure (to be created)
- `docs/engineering/flows.md` - Key user flows (to be created)

**Agent Prompts:**
- `docs/prompts/pm_agent.md` - PM prompt
- `docs/prompts/qa_agent.md` - QA prompt
- `docs/prompts/engineer_agent.md` - Engineer prompt

---

## Coding Preferences

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Style**: Modern React with functional components and hooks
- **UI**: Tailwind CSS, mobile-first responsive design
- **State**: React useState/useContext for MVP (no external state management)
- **No Backend**: All state in memory for MVP

---

## Current Status

**Completed:**
- ✅ Project structure and documentation setup
- ✅ Product vision and MVP spec defined
- ✅ Development plan created
- ✅ Next.js project initialized with TypeScript and Tailwind CSS
- ✅ Session creation page implemented
- ✅ Live session page with tab navigation implemented
- ✅ Summary/calculations page implemented
- ✅ All core MVP features complete
- ✅ Mobile-responsive design implemented
- ✅ UI/UX polish completed
- ✅ Error handling and validation added
- ✅ Accessibility improvements (ARIA labels, keyboard navigation)
- ✅ Automated testing with screenshot capture
- ✅ Documentation cleanup and organization

**MVP Status:** ✅ **COMPLETE** - Ready for deployment

**Not Started (Future Phases):**
- ⏸️ Player history & persistence
- ⏸️ Elo ratings
- ⏸️ Multi-session features

---

## Key File Locations

**Frontend:**
- `app/page.tsx` - Home page
- `app/create-session/page.tsx` - Create session page
- `app/session/[id]/page.tsx` - Live session page
- `app/session/[id]/summary/page.tsx` - Summary page

**Components:**
- `components/SessionHeader.tsx` - Session info display
- `components/LiveStatsCard.tsx` - Real-time stats display
- `components/QuickGameForm.tsx` - Game entry form
- `components/GameHistoryList.tsx` - Game history with undo
- `components/BottomTabNav.tsx` - Tab navigation
- `components/FloatingActionButton.tsx` - Quick record access

**Types:**
- `types/index.ts` - TypeScript types (Player, Session, Game)

**Context:**
- `contexts/SessionContext.tsx` - Session state management

**Utilities:**
- `lib/calculations.ts` - Calculation functions

---

## Example Tasks

When working on this project, you might be asked to:
- "Implement the create session page with form validation"
- "Add game logging UI to the live session page"
- "Implement the money calculation logic for the summary page"
- "Make the UI mobile-responsive"
- "PM agent, update the docs based on what we just did"

---

## MVP Focus

The MVP is intentionally minimal:
- **3 main pages**: Create Session, Live Session, Summary
- **No persistence**: State in memory only
- **No auth**: No user accounts needed
- **Mobile-first**: Designed for use at the court
- **Simple calculations**: Automatic money settlement

