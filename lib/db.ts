import { sql } from '@vercel/postgres';

// Database connection helper
export { sql };

// Initialize database schema
export async function initDatabase() {
  try {
    // Create sessions table
    await sql`
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
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create players table
    await sql`
      CREATE TABLE IF NOT EXISTS players (
        id VARCHAR(255) PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create games table
    await sql`
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
      )
    `;

    // Create indexes for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_players_session_id ON players(session_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_games_session_id ON games(session_id)
    `;

    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

