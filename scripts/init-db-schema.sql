-- PoweredByPace Database Schema
-- Run this in Supabase SQL Editor or via psql

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

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  date TIMESTAMP NOT NULL,
  organizer_id VARCHAR(255) NOT NULL,
  court_cost_type VARCHAR(20) NOT NULL,
  court_cost_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  bird_cost_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  bet_per_player DECIMAL(10,2) NOT NULL DEFAULT 0,
  game_mode VARCHAR(10) NOT NULL DEFAULT 'doubles',
  round_robin_count INTEGER,
  group_id VARCHAR(255) REFERENCES groups(id) ON DELETE CASCADE,
  betting_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create players table (session players)
CREATE TABLE IF NOT EXISTS players (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  group_player_id VARCHAR(255) REFERENCES group_players(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL,
  team_a JSONB NOT NULL,
  team_b JSONB NOT NULL,
  winning_team VARCHAR(1),
  team_a_score INTEGER,
  team_b_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_group_players_group_id ON group_players(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_group_id ON sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_players_session_id ON players(session_id);
CREATE INDEX IF NOT EXISTS idx_players_group_player_id ON players(group_player_id);
CREATE INDEX IF NOT EXISTS idx_games_session_id ON games(session_id);

-- Enable Row Level Security (optional, for Supabase)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read/write (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access" ON groups FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON groups FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON groups FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON group_players FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON group_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON group_players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON group_players FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON sessions FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON players FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON games FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON games FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON games FOR DELETE USING (true);

