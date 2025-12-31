#!/usr/bin/env tsx
/**
 * Standalone database migration script
 * 
 * This script runs all pending database migrations automatically.
 * Migrations are versioned and tracked in a migrations table.
 * 
 * Usage:
 *   npm run migrate:run
 *   npx tsx scripts/run-migration.ts
 * 
 * Environment variables needed:
 *   POSTGRES_URL, POSTGRES_URL_NON_POOLING, DATABASE_URL, or VERCEL_POSTGRES_URL
 * 
 * Migration files should be in scripts/migrations/ with naming:
 *   001-description.sql, 002-description.sql, etc.
 */

// Load environment variables from .env.local if it exists
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not available, that's OK
}

import { runMigration } from '../lib/migration';

async function main() {
  try {
    console.log('🔄 Starting database migration...');
    console.log(`   Environment: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
    
    const result = await runMigration();
    
    if (result.success) {
      if (result.migrationsRun && result.migrationsRun.length > 0) {
        console.log('');
        console.log('✅ Migration completed successfully!');
        console.log(`   Applied: ${result.migrationsRun.join(', ')}`);
        if (result.migrationsSkipped && result.migrationsSkipped.length > 0) {
          console.log(`   Skipped (already applied): ${result.migrationsSkipped.join(', ')}`);
        }
      } else {
        console.log('✅ ' + result.message);
      }
      process.exit(0);
    } else {
      console.error('');
      console.error('❌ Migration failed:', result.message);
      if (result.error) {
        console.error('   Error:', result.error);
      }
      console.log('');
      console.log('ℹ️  Migration will run automatically on first API request via /api/migrate');
      console.log('ℹ️  Or run manually: POST to /api/migrate or run migration SQL files manually');
      process.exit(0); // Exit with 0 to not fail the build
    }
  } catch (error: any) {
    console.error('❌ Migration script error:', error.message || error);
    console.error('   Stack:', error.stack);
    console.log('');
    console.log('ℹ️  Migration will run automatically on first API request via /api/migrate');
    process.exit(0); // Exit with 0 to not fail the build
  }
}

// Run migration
main();

