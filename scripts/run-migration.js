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
 *   POSTGRES_URL, POSTGRES_URL_NON_POOLING, DATABASE_URL, or VERCEL_POSTGRES_URL
 * 
 * Note: On Vercel, this runs during build but may not have DB access.
 * The migration will also run automatically on first API request via /api/migrate
 */

// Load environment variables from .env.local if it exists
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not available, that's OK
}

const { readFileSync } = require('fs');
const { join } = require('path');

async function runMigration() {
  try {
    // Get Postgres connection string
    // Check multiple possible environment variable names (including Vercel-specific)
    const connectionString = 
      process.env.POSTGRES_URL || 
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      process.env.VERCEL_POSTGRES_URL ||
      process.env.VERCEL_POSTGRES_URL_NON_POOLING;

    if (!connectionString) {
      console.error('❌ Postgres connection string not found');
      console.error('Checked for: POSTGRES_URL, POSTGRES_URL_NON_POOLING, DATABASE_URL, VERCEL_POSTGRES_URL');
      console.log('ℹ️  Skipping migration during build (this is OK)');
      console.log('ℹ️  Migration will run automatically on first API request via /api/migrate');
      process.exit(0); // Exit with 0 to not fail the build
    }

    console.log('🔄 Starting database migration...');
    console.log(`   Environment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
    console.log(`   Connection string: ${connectionString.substring(0, 20)}...`);

    // Read migration SQL file
    const migrationPath = join(process.cwd(), 'scripts', 'migrate-add-groups.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Dynamically import pg
    const { Pool } = require('pg');

    // Connect to database
    // For Supabase and cloud Postgres, we need SSL with self-signed cert support
    const isLocalhost = connectionString.includes('localhost') || 
                       connectionString.includes('127.0.0.1');
    
    // Remove any existing SSL parameters from connection string to avoid conflicts
    // We'll handle SSL via the Pool's ssl option instead
    // This is critical: sslmode=require in the connection string enforces cert validation
    // which conflicts with rejectUnauthorized: false
    let cleanConnectionString = connectionString
      .replace(/[?&]sslmode=[^&]*/gi, '')  // Case insensitive
      .replace(/[?&]ssl=[^&]*/gi, '')
      .replace(/[?&]sslcert=[^&]*/gi, '')
      .replace(/[?&]sslkey=[^&]*/gi, '')
      .replace(/[?&]sslrootcert=[^&]*/gi, '')
      .replace(/[?&]supa=[^&]*/gi, '')  // Remove Supabase pooler params
      .replace(/[?&]pgbouncer=[^&]*/gi, '');  // Remove pgbouncer params
    
    // Clean up any trailing ? or & after removing params
    cleanConnectionString = cleanConnectionString.replace(/[?&]$/, '');
    
    // Use SSL for all remote connections (not localhost)
    // Allow self-signed certificates for Supabase and other cloud providers
    const sslConfig = !isLocalhost 
      ? { rejectUnauthorized: false } 
      : undefined;
    
    const pool = new Pool({
      connectionString: cleanConnectionString,
      ssl: sslConfig,
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
        console.log(`   Executing ${statements.length} SQL statements...`);
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i].trim();
          if (statement) {
            try {
              await client.query(statement);
              console.log(`[Migration] Executed statement ${i + 1}/${statements.length}`);
            } catch (stmtError) {
              // If policy already exists, that's OK - continue
              if (stmtError.message?.includes('already exists') && 
                  statement.toUpperCase().includes('CREATE POLICY')) {
                console.log(`[Migration] Policy already exists, skipping: ${statement.substring(0, 50)}...`);
                continue;
              }
              // If table/column/index already exists, that's OK - continue
              if (stmtError.message?.includes('already exists') || 
                  stmtError.code === '42P07' ||  // duplicate_table
                  stmtError.code === '42710' ||   // duplicate_object
                  stmtError.code === '42P16') {   // invalid_table_definition (constraint already exists)
                console.log(`[Migration] Already exists, skipping: ${statement.substring(0, 50)}...`);
                continue;
              }
              // If constraint already exists (different error message)
              if (stmtError.message?.includes('constraint') && 
                  (stmtError.message?.includes('already exists') || 
                   stmtError.message?.includes('duplicate'))) {
                console.log(`[Migration] Constraint already exists, skipping: ${statement.substring(0, 50)}...`);
                continue;
              }
              // Otherwise, rethrow the error
              throw new Error(`Statement ${i + 1} failed: ${stmtError.message}\nSQL: ${statement.substring(0, 100)}`);
            }
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
    console.error('   Stack:', error.stack);
    // Don't fail the build if migration fails - just log the error
    // The migration can be run manually or via the API endpoint
    console.log('ℹ️  Migration will run automatically on first API request via /api/migrate');
    console.log('ℹ️  Or run manually: POST to /api/migrate or run scripts/migrate-add-groups.sql');
    process.exit(0); // Exit with 0 to not fail the build
  }
}

// Run migration
runMigration();

