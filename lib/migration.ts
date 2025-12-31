/**
 * Migration utility functions
 * Used by both the API endpoint and the build script
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface MigrationResult {
  success: boolean;
  message: string;
  tablesCreated?: string[];
  columnsAdded?: string[];
  error?: string;
  errorCode?: string;
  errorDetails?: string;
  alreadyApplied?: boolean;
}

/**
 * Run the database migration
 */
export async function runMigration(): Promise<MigrationResult> {
  // Get Postgres connection string (declare outside try for error logging)
  // Prefer NON_POOLING for migrations as they need direct connections
  const connectionString = 
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.VERCEL_POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL || 
    process.env.VERCEL_POSTGRES_URL ||
    process.env.DATABASE_URL;

  try {
    if (!connectionString) {
      return {
        success: false,
        message: 'Postgres connection string not found',
        error: 'Missing POSTGRES_URL, POSTGRES_URL_NON_POOLING, DATABASE_URL, or VERCEL_POSTGRES_URL environment variable'
      };
    }

    // Read migration SQL file
    const migrationPath = join(process.cwd(), 'scripts', 'migrate-add-groups.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Dynamically import pg to avoid bundling issues
    const { Pool } = await import('pg');

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
      // Handle multi-line statements and comments properly
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => {
          // Remove empty lines and comments
          if (s.length === 0) return false;
          if (s.startsWith('--')) return false;
          // Remove lines that are only whitespace
          if (s.match(/^\s*$/)) return false;
          return true;
        });

      const client = await pool.connect();
      
      try {
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i].trim();
          if (statement) {
            try {
              await client.query(statement);
              console.log(`[Migration] Executed statement ${i + 1}/${statements.length}`);
            } catch (stmtError: any) {
              // If policy already exists, that's OK - continue
              if (stmtError.message?.includes('already exists') && 
                  statement.toUpperCase().includes('CREATE POLICY')) {
                console.log(`[Migration] Policy already exists, skipping: ${statement.substring(0, 50)}...`);
                continue;
              }
              // If table/column already exists, that's OK - continue
              if (stmtError.message?.includes('already exists') || 
                  stmtError.code === '42P07' ||
                  stmtError.code === '42710') {
                console.log(`[Migration] Already exists, skipping: ${statement.substring(0, 50)}...`);
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

      return {
        success: true,
        message: 'Migration completed successfully',
        tablesCreated: ['groups', 'group_players'],
        columnsAdded: [
          'sessions.group_id',
          'sessions.betting_enabled',
          'players.group_player_id'
        ]
      };

    } catch (dbError: any) {
      await pool.end();
      
      // Check if tables already exist (not an error)
      if (dbError.message?.includes('already exists') || 
          dbError.message?.includes('duplicate') ||
          dbError.code === '42P07') {
        return {
          success: true,
          message: 'Migration already applied (tables/columns already exist)',
          alreadyApplied: true
        };
      }

      throw dbError;
    }

  } catch (error: any) {
    console.error('[Migration] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      connectionString: connectionString ? `${connectionString.substring(0, 20)}...` : 'none'
    });
    
    return {
      success: false,
      message: 'Migration failed',
      error: error.message || 'Unknown error',
      errorCode: error.code,
      errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
}

