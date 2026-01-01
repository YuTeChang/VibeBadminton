-- Migration: Add pairing stats tables for partner and head-to-head tracking
-- Run this in Supabase SQL Editor or via psql

-- ============================================================================
-- Table: partner_stats
-- Tracks win/loss record when two players are on the same team
-- ============================================================================
CREATE TABLE IF NOT EXISTS partner_stats (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id VARCHAR(255) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  player1_id VARCHAR(255) NOT NULL REFERENCES group_players(id) ON DELETE CASCADE,
  player2_id VARCHAR(255) NOT NULL REFERENCES group_players(id) ON DELETE CASCADE,
  wins INTEGER DEFAULT 0 NOT NULL,
  losses INTEGER DEFAULT 0 NOT NULL,
  total_games INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Ensure player1_id < player2_id for consistent key ordering
  CONSTRAINT partner_stats_unique UNIQUE (group_id, player1_id, player2_id),
  CONSTRAINT partner_stats_order CHECK (player1_id < player2_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_partner_stats_group ON partner_stats(group_id);
CREATE INDEX IF NOT EXISTS idx_partner_stats_player1 ON partner_stats(player1_id);
CREATE INDEX IF NOT EXISTS idx_partner_stats_player2 ON partner_stats(player2_id);
CREATE INDEX IF NOT EXISTS idx_partner_stats_wins ON partner_stats(group_id, wins DESC);

-- ============================================================================
-- Table: pairing_matchups
-- Tracks head-to-head record between two pairings (e.g., A&B vs C&D)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pairing_matchups (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id VARCHAR(255) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  -- Team 1 (always sorted: player1 < player2)
  team1_player1_id VARCHAR(255) NOT NULL REFERENCES group_players(id) ON DELETE CASCADE,
  team1_player2_id VARCHAR(255) NOT NULL REFERENCES group_players(id) ON DELETE CASCADE,
  -- Team 2 (always sorted: player1 < player2)
  team2_player1_id VARCHAR(255) NOT NULL REFERENCES group_players(id) ON DELETE CASCADE,
  team2_player2_id VARCHAR(255) NOT NULL REFERENCES group_players(id) ON DELETE CASCADE,
  -- Wins/losses from team1's perspective (team1 won X times, lost Y times to team2)
  team1_wins INTEGER DEFAULT 0 NOT NULL,
  team1_losses INTEGER DEFAULT 0 NOT NULL,
  total_games INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Ensure consistent ordering: team1 < team2 (by concatenated IDs)
  CONSTRAINT pairing_matchups_unique UNIQUE (
    group_id, 
    team1_player1_id, team1_player2_id, 
    team2_player1_id, team2_player2_id
  ),
  -- Ensure players within each team are ordered
  CONSTRAINT pairing_matchups_team1_order CHECK (team1_player1_id < team1_player2_id),
  CONSTRAINT pairing_matchups_team2_order CHECK (team2_player1_id < team2_player2_id),
  -- Ensure team1 < team2 by comparing concatenated IDs
  CONSTRAINT pairing_matchups_teams_order CHECK (
    (team1_player1_id || team1_player2_id) < (team2_player1_id || team2_player2_id)
  )
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pairing_matchups_group ON pairing_matchups(group_id);
CREATE INDEX IF NOT EXISTS idx_pairing_matchups_team1 ON pairing_matchups(team1_player1_id, team1_player2_id);
CREATE INDEX IF NOT EXISTS idx_pairing_matchups_team2 ON pairing_matchups(team2_player1_id, team2_player2_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
ALTER TABLE partner_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairing_matchups ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access (same as other tables)
CREATE POLICY "Allow public read access" ON partner_stats FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON partner_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON partner_stats FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON partner_stats FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON pairing_matchups FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON pairing_matchups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON pairing_matchups FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON pairing_matchups FOR DELETE USING (true);

-- ============================================================================
-- Helper function to ensure consistent player ordering in pairs
-- ============================================================================
CREATE OR REPLACE FUNCTION get_ordered_pair(id1 VARCHAR, id2 VARCHAR)
RETURNS TABLE(first_id VARCHAR, second_id VARCHAR) AS $$
BEGIN
  IF id1 < id2 THEN
    RETURN QUERY SELECT id1, id2;
  ELSE
    RETURN QUERY SELECT id2, id1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

