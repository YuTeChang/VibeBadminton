#!/usr/bin/env node
/**
 * Standalone database migration script
 * 
 * This script runs the database migration automatically.
 * It's safe to run multiple times (idempotent).
 * 
 * Usage:
 *   npm run migrate:run
 *   or
 *   ts-node scripts/run-migration.ts
 * 
 * Environment variables needed:
 *   POSTGRES_URL or POSTGRES_URL_NON_POOLING or DATABASE_URL
 */

import { readFileSync } from 'fs';
import { join } from 'path';

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
      process.exit(1);
    }

    console.log('🔄 Starting database migration...');

    // Read migration SQL file
    const migrationPath = join(process.cwd(), 'scripts', 'migrate-add-groups.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Dynamically import pg to avoid bundling issues
    const { Pool } = await import('pg');

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

    } catch (dbError: any) {
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

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message || error);
    process.exit(1);
  }
}

// Run migration
runMigration();

