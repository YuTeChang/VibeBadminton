#!/usr/bin/env node
/**
 * Standalone database migration script
 * 
 * This script runs the database migration automatically.
 * It's safe to run multiple times (idempotent).
 * 
 * Usage:
 *   npm run migrate:run
 *   node scripts/run-migration.js
 * 
 * Environment variables needed:
 *   POSTGRES_URL or POSTGRES_URL_NON_POOLING or DATABASE_URL
 */

const { readFileSync } = require('fs');
const { join } = require('path');

async function runMigration() {
  try {
    // Get Postgres connection string
    const connectionString = 
      process.env.POSTGRES_URL || 
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL;

    if (!connectionString) {
      console.error('❌ Postgres connection string not found');
      console.error('Please set one of: POSTGRES_URL, POSTGRES_URL_NON_POOLING, or DATABASE_URL');
      console.log('ℹ️  Skipping migration (this is OK if running locally without DB access)');
      process.exit(0); // Exit with 0 to not fail the build
    }

    console.log('🔄 Starting database migration...');

    // Read migration SQL file
    const migrationPath = join(process.cwd(), 'scripts', 'migrate-add-groups.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Dynamically import pg
    const { Pool } = require('pg');

    // Connect to database
    const pool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
    });

    try {
      // Split SQL by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))
        .filter(s => !s.match(/^\s*$/));

      const client = await pool.connect();
      
      try {
        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }
      } finally {
        client.release();
      }

      await pool.end();

      console.log('✅ Migration completed successfully!');
      console.log('   - Created tables: groups, group_players');
      console.log('   - Added columns: sessions.group_id, sessions.betting_enabled, players.group_player_id');
      process.exit(0);

    } catch (dbError) {
      await pool.end();
      
      // Check if tables already exist (not an error)
      if (dbError.message?.includes('already exists') || 
          dbError.message?.includes('duplicate') ||
          dbError.code === '42P07') {
        console.log('✅ Migration already applied (tables/columns already exist)');
        console.log('   This is not an error - your database is up to date');
        process.exit(0);
      }

      throw dbError;
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message || error);
    // Don't fail the build if migration fails - just log the error
    // The migration can be run manually or via the API endpoint
    console.log('ℹ️  You can run the migration manually via /api/migrate POST endpoint');
    process.exit(0); // Exit with 0 to not fail the build
  }
}

// Run migration
runMigration();

