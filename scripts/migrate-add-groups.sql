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
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS group_id VARCHAR(255) REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS betting_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add new column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS group_player_id VARCHAR(255) REFERENCES group_players(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_players_group_id ON group_players(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_group_id ON sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_players_group_player_id ON players(group_player_id);

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


