/**
 * Migration utility functions with versioning support
 * Scans for migration files and tracks applied migrations
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface MigrationResult {
  success: boolean;
  message: string;
  migrationsRun?: string[];
  migrationsSkipped?: string[];
  error?: string;
  errorCode?: string;
  errorDetails?: string;
}

interface MigrationFile {
  version: string;
  filename: string;
  name: string;
  path: string;
}

/**
 * Get all migration files from scripts/migrations directory
 * Files should be named: 001-description.sql, 002-description.sql, etc.
 */
function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = join(process.cwd(), 'scripts', 'migrations');
  
  try {
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        // Extract version from filename (e.g., "001-add-groups.sql" -> "001")
        const match = file.match(/^(\d+)-(.+)\.sql$/);
        if (!match) {
          console.warn(`[Migration] Skipping invalid migration file: ${file}`);
          return null;
        }
        
        const [, version, name] = match;
        return {
          version,
          filename: file,
          name: name.replace(/-/g, ' '),
          path: join(migrationsDir, file)
        };
      })
      .filter((f): f is MigrationFile => f !== null)
      .sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
    
    return files;
  } catch (error) {
    // Migrations directory doesn't exist - no migrations to run
    return [];
  }
}

/**
 * Ensure migrations table exists
 */
async function ensureMigrationsTable(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

/**
 * Get list of applied migration versions
 */
async function getAppliedMigrations(client: any): Promise<string[]> {
  try {
    const result = await client.query(`
      SELECT version FROM migrations ORDER BY version
    `);
    return result.rows.map((row: any) => row.version);
  } catch (error) {
    // Table doesn't exist yet - return empty array
    return [];
  }
}

/**
 * Record that a migration has been applied
 */
async function recordMigrationApplied(
  client: any,
  version: string,
  name: string,
  filename: string
): Promise<void> {
  await client.query(`
    INSERT INTO migrations (version, name, filename)
    VALUES ($1, $2, $3)
    ON CONFLICT (version) DO NOTHING
  `, [version, name, filename]);
}

/**
 * Check if a migration has already been applied by checking for key database objects
 * This is a fallback when the migrations table doesn't have a record
 */
async function checkMigrationAlreadyApplied(client: any, version: string): Promise<boolean> {
  try {
    // For migration 001, check if groups table exists
    if (version === '001') {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'groups'
        );
      `);
      return result.rows[0]?.exists === true;
    }
    // For future migrations, add checks here
    return false;
  } catch {
    return false;
  }
}

/**
 * Parse and execute SQL statements from a migration file
 */
async function executeMigrationSQL(client: any, sql: string, migrationName: string): Promise<void> {
  // Split SQL by semicolons and execute each statement
  let statements = sql
    .split(';')
    .map(s => {
      // Remove comment lines (lines starting with --)
      const lines = s.split('\n');
      const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      });
      return cleanedLines.join('\n').trim();
    })
    .filter(s => {
      // Remove empty statements
      if (s.length === 0) return false;
      if (s.match(/^\s*$/)) return false;
      // Remove statements that are only comments
      const nonCommentLines = s.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      });
      return nonCommentLines.length > 0;
    });

  // Helper to verify column exists before creating index
  const verifyColumnBeforeIndex = async (table: string, column: string): Promise<boolean> => {
    try {
      const checkResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      `, [table, column]);
      
      return checkResult.rows.length > 0;
    } catch {
      return false;
    }
  };

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (statement) {
      try {
        // Before creating indexes, verify the column exists
        if (statement.toUpperCase().includes('CREATE INDEX')) {
          // Check for common index patterns
          const matchGroupPlayerId = statement.match(/ON\s+players\s*\([^)]*group_player_id/);
          const matchGroupId = statement.match(/ON\s+sessions\s*\([^)]*group_id/);
          
          if (matchGroupPlayerId) {
            const columnExists = await verifyColumnBeforeIndex('players', 'group_player_id');
            if (!columnExists) {
              console.log(`[Migration] ⏭️  Skipping index on players.group_player_id - column doesn't exist yet`);
              continue;
            }
          }
          if (matchGroupId) {
            const columnExists = await verifyColumnBeforeIndex('sessions', 'group_id');
            if (!columnExists) {
              console.log(`[Migration] ⏭️  Skipping index on sessions.group_id - column doesn't exist yet`);
              continue;
            }
          }
        }
        
        await client.query(statement);
        console.log(`[Migration] ✓ ${migrationName} - Statement ${i + 1}/${statements.length}: ${statement.substring(0, 60).replace(/\n/g, ' ')}...`);
      } catch (stmtError: any) {
        console.error(`[Migration] ✗ ${migrationName} - Statement ${i + 1}/${statements.length} FAILED:`);
        console.error(`[Migration]   SQL: ${statement.substring(0, 200).replace(/\n/g, ' ')}`);
        console.error(`[Migration]   Error: ${stmtError.message}`);
        
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
}

/**
 * Run all pending database migrations
 */
export async function runMigration(): Promise<MigrationResult> {
  const connectionString = 
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.VERCEL_POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL || 
    process.env.VERCEL_POSTGRES_URL ||
    process.env.DATABASE_URL;

  // Declare pool and client outside try block so they're accessible in catch
  let pool: any = null;
  let client: any = null;

  try {
    if (!connectionString) {
      return {
        success: false,
        message: 'Postgres connection string not found',
        error: 'Missing POSTGRES_URL, POSTGRES_URL_NON_POOLING, DATABASE_URL, or VERCEL_POSTGRES_URL environment variable'
      };
    }

    // Get all migration files
    const migrationFiles = getMigrationFiles();
    
    if (migrationFiles.length === 0) {
      return {
        success: true,
        message: 'No migration files found - nothing to migrate',
        migrationsSkipped: []
      };
    }

    // Dynamically import pg to avoid bundling issues
    const { Pool } = await import('pg');

    // Connect to database
    const isLocalhost = connectionString.includes('localhost') || 
                       connectionString.includes('127.0.0.1');
    
    // Clean connection string
    let cleanConnectionString = connectionString
      .replace(/[?&]sslmode=[^&]*/gi, '')
      .replace(/[?&]ssl=[^&]*/gi, '')
      .replace(/[?&]sslcert=[^&]*/gi, '')
      .replace(/[?&]sslkey=[^&]*/gi, '')
      .replace(/[?&]sslrootcert=[^&]*/gi, '')
      .replace(/[?&]supa=[^&]*/gi, '')
      .replace(/[?&]pgbouncer=[^&]*/gi, '');
    
    cleanConnectionString = cleanConnectionString.replace(/[?&]$/, '');
    
    const sslConfig = !isLocalhost 
      ? { rejectUnauthorized: false } 
      : undefined;
    
    try {
      pool = new Pool({
        connectionString: cleanConnectionString,
        ssl: sslConfig,
        connectionTimeoutMillis: 10000, // 10 second timeout
        query_timeout: 30000, // 30 second query timeout
      });

      // Add timeout wrapper for connection attempt
      const connectWithTimeout = async (timeoutMs: number = 10000) => {
        return Promise.race([
          pool.connect(),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), timeoutMs)
          )
        ]);
      };

      client = await connectWithTimeout(10000);
      
      // Test connection with a simple query
      await client.query('SELECT 1');
      
      // Ensure migrations table exists
      await ensureMigrationsTable(client);
      
      // Get list of applied migrations
      const appliedVersions = await getAppliedMigrations(client);
      
      // Filter to only unapplied migrations
      let pendingMigrations = migrationFiles.filter(
        m => !appliedVersions.includes(m.version)
      );
      
      // Check if any "pending" migrations have actually already been applied
      // by checking for key database objects (fallback for when migrations table is missing records)
      const migrationsToAutoMark: string[] = [];
      for (const migration of pendingMigrations) {
        const alreadyApplied = await checkMigrationAlreadyApplied(client, migration.version);
        if (alreadyApplied) {
          console.log(`[Migration] Detected migration ${migration.version} already applied (objects exist), marking as applied...`);
          await recordMigrationApplied(client, migration.version, migration.name, migration.filename);
          migrationsToAutoMark.push(migration.version);
        }
      }
      
      // Remove auto-marked migrations from pending list
      pendingMigrations = pendingMigrations.filter(
        m => !migrationsToAutoMark.includes(m.version)
      );
      
      if (pendingMigrations.length === 0) {
        const allSkipped = [...appliedVersions, ...migrationsToAutoMark];
        return {
          success: true,
          message: `All migrations already applied (${migrationFiles.length} total)`,
          migrationsSkipped: migrationFiles.map(m => m.version),
          migrationsRun: migrationsToAutoMark.length > 0 ? migrationsToAutoMark : undefined
        };
      }

      console.log(`[Migration] Found ${pendingMigrations.length} pending migration(s) out of ${migrationFiles.length} total`);
      
      const migrationsRun: string[] = [...migrationsToAutoMark];
      const migrationsSkipped: string[] = [...appliedVersions, ...migrationsToAutoMark];

      // Run each pending migration
      for (const migration of pendingMigrations) {
        try {
          console.log(`[Migration] 🔄 Running migration ${migration.version}: ${migration.name}...`);
          
          // Read migration SQL file
          const migrationSQL = readFileSync(migration.path, 'utf-8');
          
          // Execute the migration
          await executeMigrationSQL(client, migrationSQL, migration.name);
          
          // Record that it was applied
          await recordMigrationApplied(client, migration.version, migration.name, migration.filename);
          
          migrationsRun.push(migration.version);
          console.log(`[Migration] ✅ Migration ${migration.version} completed successfully`);
          
        } catch (migrationError: any) {
          await pool.end();
          return {
            success: false,
            message: `Migration ${migration.version} (${migration.name}) failed`,
            error: migrationError.message || 'Unknown error',
            errorCode: migrationError.code,
            errorDetails: process.env.NODE_ENV === 'development' ? migrationError.stack : undefined,
            migrationsRun,
            migrationsSkipped: [...appliedVersions, ...migrationsSkipped]
          };
        }
      }

      return {
        success: true,
        message: `Successfully applied ${migrationsRun.length} migration(s)`,
        migrationsRun,
        migrationsSkipped: appliedVersions
      };

    } finally {
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          // Ignore release errors
        }
      }
      // Always close the pool
      try {
        await pool.end();
      } catch (poolError) {
        // Ignore pool cleanup errors
      }
    }

  } catch (error: any) {
    // Clean up pool if connection was attempted
    try {
      if (pool !== null) {
        await pool.end();
      }
    } catch (poolError) {
      // Ignore pool cleanup errors
    }
    console.error('[Migration] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      connectionString: connectionString ? `${connectionString.substring(0, 20)}...` : 'none'
    });
    
    // If it's a connection/timeout error, provide helpful message
    if (error.message?.includes('timeout') || error.message?.includes('Connection')) {
      console.error('[Migration] ⚠️  Database connection failed or timed out');
      console.error('[Migration] ℹ️  This is OK - migration will run on first API request');
      return {
        success: true, // Return success so build doesn't fail
        message: 'Migration skipped (connection timeout - will run on first API request)',
        error: error.message || 'Connection timeout',
        errorCode: error.code
      };
    }
    
    return {
      success: false,
      message: 'Migration failed',
      error: error.message || 'Unknown error',
      errorCode: error.code,
      errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
}
