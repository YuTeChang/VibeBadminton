import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Database initialization endpoint
 * 
 * This endpoint can initialize or migrate the database schema.
 * It checks what tables exist and applies the necessary migrations.
 */
export async function POST() {
  try {
    const supabase = createSupabaseClient();
    
    // Check if groups table exists
    const { data: groupsCheck, error: groupsError } = await supabase
      .from('groups')
      .select('id')
      .limit(1);
    
    // Table exists if no error or error is just "no rows" (PGRST116)
    // Table doesn't exist if error indicates missing relation
    const groupsTableExists = !groupsError || 
      (groupsError.code === 'PGRST116') ||
      (!groupsError.message?.toLowerCase().includes('does not exist') && 
       !groupsError.message?.toLowerCase().includes('relation') &&
       groupsError.code !== '42P01');
    
    // Check if sessions table exists (to determine if this is a new or existing DB)
    const { data: sessionsCheck, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .limit(1);
    
    const sessionsTableExists = !sessionsError || sessionsError.code !== 'PGRST116';
    
    if (!sessionsTableExists) {
      // New database - need full schema
      return NextResponse.json({
        success: false,
        message: 'Database not initialized. Please run the full schema first.',
        instructions: [
          '1. Go to your Supabase project dashboard',
          '2. Navigate to SQL Editor',
          '3. Copy the contents of scripts/init-db-schema.sql',
          '4. Paste and run in SQL Editor',
          '5. Then try creating a group again'
        ],
        sqlFile: 'scripts/init-db-schema.sql'
      }, { status: 400 });
    }
    
    if (!groupsTableExists) {
      // Existing database without groups - need migration
      return NextResponse.json({
        success: false,
        message: 'Groups feature not set up. Migration needed.',
        migrationNeeded: true,
        automaticMigration: {
          available: !!process.env.POSTGRES_URL || !!process.env.POSTGRES_URL_NON_POOLING,
          endpoint: '/api/migrate',
          method: 'POST',
          note: 'If POSTGRES_URL is set in .env.local, you can POST to /api/migrate to run automatically'
        },
        manualMigration: {
          instructions: [
            '1. Go to your Supabase project dashboard',
            '2. Navigate to SQL Editor',
            '3. Copy the contents of scripts/migrate-add-groups.sql',
            '4. Paste and run in SQL Editor',
            '5. Then try creating a group again'
          ],
          sqlFile: 'scripts/migrate-add-groups.sql'
        }
      }, { status: 400 });
    }
    
    // Database is up to date
    return NextResponse.json({
      success: true,
      message: 'Database is initialized and up to date',
      groupsTableExists: true,
      sessionsTableExists: true
    });
    
  } catch (error: any) {
    console.error('[Init] Error checking database:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      message: 'Could not check database status. Please verify your Supabase connection.',
      instructions: [
        '1. Check your .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
        '2. Verify your Supabase project is active',
        '3. Try running the SQL schema manually in Supabase SQL Editor'
      ]
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check database status
 */
export async function GET() {
  try {
    const supabase = createSupabaseClient();
    
    // Check tables
    const [groupsCheck, sessionsCheck] = await Promise.all([
      supabase.from('groups').select('id').limit(1),
      supabase.from('sessions').select('id').limit(1)
    ]);
    
    // More accurate table existence check
    const groupsExists = !groupsCheck.error || 
      (groupsCheck.error.code === 'PGRST116') ||
      (!groupsCheck.error.message?.toLowerCase().includes('does not exist') && 
       !groupsCheck.error.message?.toLowerCase().includes('relation') &&
       groupsCheck.error.code !== '42P01');
    
    const sessionsExists = !sessionsCheck.error || 
      (sessionsCheck.error.code === 'PGRST116') ||
      (!sessionsCheck.error.message?.toLowerCase().includes('does not exist') && 
       !sessionsCheck.error.message?.toLowerCase().includes('relation') &&
       sessionsCheck.error.code !== '42P01');
    
    return NextResponse.json({
      ok: true,
      groupsTableExists: groupsExists,
      sessionsTableExists: sessionsExists,
      migrationNeeded: sessionsExists && !groupsExists,
      message: groupsExists 
        ? 'Database is up to date' 
        : sessionsExists 
          ? 'Migration needed: Run scripts/migrate-add-groups.sql'
          : 'Full schema needed: Run scripts/init-db-schema.sql'
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
