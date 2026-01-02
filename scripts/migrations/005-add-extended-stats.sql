-- Migration: Add extended stats for players and pairings
-- Version: 005
-- Description: Adds streak tracking, pairing ELO, and point differential tracking

-- ============================================================================
-- Add streak tracking to group_players
-- ============================================================================

-- Current streak: positive for wins, negative for losses (e.g., +3 = 3 wins, -2 = 2 losses)
ALTER TABLE group_players ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

-- Best win streak ever achieved
ALTER TABLE group_players ADD COLUMN IF NOT EXISTS best_win_streak INTEGER DEFAULT 0;

-- Number of sessions attended
ALTER TABLE group_players ADD COLUMN IF NOT EXISTS sessions_attended INTEGER DEFAULT 0;

-- ============================================================================
-- Add ELO and extended stats to partner_stats
-- ============================================================================

-- Pairing ELO rating (independent of individual ELO, treats pair as single unit)
ALTER TABLE partner_stats ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1500;

-- Current streak for this pairing: positive for wins, negative for losses
ALTER TABLE partner_stats ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

-- Best win streak for this pairing
ALTER TABLE partner_stats ADD COLUMN IF NOT EXISTS best_win_streak INTEGER DEFAULT 0;

-- Point tracking for point differential
ALTER TABLE partner_stats ADD COLUMN IF NOT EXISTS points_for INTEGER DEFAULT 0;
ALTER TABLE partner_stats ADD COLUMN IF NOT EXISTS points_against INTEGER DEFAULT 0;
