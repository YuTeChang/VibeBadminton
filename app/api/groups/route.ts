import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';
import { runMigration } from '@/lib/migration';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/groups - Get all groups
export async function GET() {
  try {
    // Try to get groups - if migration is needed, it will be handled automatically
    const groups = await GroupService.getAllGroups();
    return NextResponse.json(groups);
  } catch (error: any) {
    console.error('[API] Error fetching groups:', error);
    
    // Check if it's a table missing error - try auto-migration
    if (error.message?.includes('relation') || 
        error.message?.includes('does not exist') ||
        error.code === '42P01' ||
        error.code === 'PGRST116') {
      
      console.log('[Groups API] Table missing, attempting auto-migration...');
      const migrationResult = await runMigration();
      
      if (!migrationResult.success) {
        return NextResponse.json(
          { 
            error: 'Database migration needed',
            message: 'Automatic migration failed',
            autoMigrationAttempted: true,
            autoMigrationResult: migrationResult,
            instructions: [
              'Automatic migration failed. Please run manually:',
              '1. Go to your Supabase project dashboard',
              '2. Navigate to SQL Editor',
              '3. Copy the contents of scripts/migrations/*.sql files',
              '4. Paste and run in SQL Editor',
              '5. Refresh this page'
            ]
          },
          { status: 503 }
        );
      }
      
      console.log('[Groups API] Auto-migration successful:', migrationResult.message);
      
      // Retry getting groups after migration
      try {
        const groups = await GroupService.getAllGroups();
        return NextResponse.json(groups);
      } catch (retryError) {
        return NextResponse.json(
          { error: 'Failed to load groups after migration' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch groups', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  // Read request body once
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json(
      { error: 'Group name is required' },
      { status: 400 }
    );
  }

  try {
    const group = await GroupService.createGroup(name);
    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    console.error('[API] Error creating group:', error);
    
    // Check if it's a table missing error - try auto-migration
    if (error.message?.includes('relation') || 
        error.message?.includes('does not exist') || 
        error.code === 'PGRST116' ||
        error.code === '42P01') {
      
      console.log('[Groups API] Table missing, attempting auto-migration...');
      const migrationResult = await runMigration();
      
      if (!migrationResult.success) {
        return NextResponse.json(
          { 
            error: 'Database migration needed',
            message: 'Automatic migration failed',
            autoMigrationAttempted: true,
            autoMigrationResult: migrationResult,
            instructions: [
              'Automatic migration failed. Please run manually:',
              '1. Go to your Supabase project dashboard',
              '2. Navigate to SQL Editor',
              '3. Copy the contents of scripts/migrations/*.sql files',
              '4. Paste and run in SQL Editor',
              '5. Try creating the group again'
            ]
          },
          { status: 503 }
        );
      }
      
      console.log('[Groups API] Auto-migration successful:', migrationResult.message);
      
      // Retry creating group after migration (use the name we already read)
      try {
        const group = await GroupService.createGroup(name);
        return NextResponse.json({ success: true, group });
      } catch (retryError: any) {
        return NextResponse.json(
          { 
            error: 'Failed to create group after migration',
            details: retryError.message 
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create group', details: error.message },
      { status: 500 }
    );
  }
}

