-- Migration: Add groups feature to PoweredByPace
-- Run this in Supabase SQL Editor to add groups to an existing database

-- Create groups table (for recurring badminton groups)
CREATE TABLE IF NOT EXISTS groups (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  shareable_link VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create group_players table (player pool per group)
CREATE TABLE IF NOT EXISTS group_players (
  id VARCHAR(255) PRIMARY KEY,
  group_id VARCHAR(255) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add new columns to sessions table
-- First add the column without foreign key constraint
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS group_id VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS betting_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add new column to players table
-- First add the column without foreign key constraint
ALTER TABLE players ADD COLUMN IF NOT EXISTS group_player_id VARCHAR(255);

-- Create indexes (AFTER columns are added)
-- Verify columns exist before creating indexes
CREATE INDEX IF NOT EXISTS idx_group_players_group_id ON group_players(group_id);

-- Create indexes only if columns exist (will fail gracefully if they don't)
-- These are created after ALTER TABLE statements above, so columns should exist
CREATE INDEX IF NOT EXISTS idx_sessions_group_id ON sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_players_group_player_id ON players(group_player_id);

-- Add foreign key constraints (after all tables and columns are created)
-- These will fail gracefully if constraints already exist
ALTER TABLE sessions ADD CONSTRAINT sessions_group_id_fkey 
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

ALTER TABLE players ADD CONSTRAINT players_group_player_id_fkey 
  FOREIGN KEY (group_player_id) REFERENCES group_players(id);

-- Enable Row Level Security for new tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_players ENABLE ROW LEVEL SECURITY;

-- Create policies for groups table
CREATE POLICY "Allow public read access" ON groups FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON groups FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON groups FOR DELETE USING (true);

-- Create policies for group_players table
CREATE POLICY "Allow public read access" ON group_players FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON group_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON group_players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON group_players FOR DELETE USING (true);

-- Ensure RLS is enabled on existing tables (if not already)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Create policies for sessions table (if they don't exist)
-- Note: CREATE POLICY IF NOT EXISTS is not supported, so we'll catch errors if they exist
CREATE POLICY "Allow public read access" ON sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON sessions FOR DELETE USING (true);

-- Create policies for players table (if they don't exist)
CREATE POLICY "Allow public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON players FOR DELETE USING (true);

-- Create policies for games table (if they don't exist)
CREATE POLICY "Allow public read access" ON games FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON games FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON games FOR DELETE USING (true);


