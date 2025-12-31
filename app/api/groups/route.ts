import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';
import { createSupabaseClient } from '@/lib/supabase';

// GET /api/groups - Get all groups
export async function GET() {
  try {
    // Check if groups table exists
    const supabase = createSupabaseClient();
    const { error: tableError } = await supabase.from('groups').select('id').limit(1);
    
    // Check if table doesn't exist (not just "no rows")
    const tableMissing = tableError && 
      (tableError.code === '42P01' ||
       tableError.message?.toLowerCase().includes('does not exist') ||
       tableError.message?.toLowerCase().includes('relation') && 
       !tableError.message?.toLowerCase().includes('permission'));
    
    if (tableMissing) {
      return NextResponse.json(
        { 
          error: 'Groups table does not exist',
          message: 'Database migration needed',
          instructions: [
            '1. Go to your Supabase project dashboard',
            '2. Navigate to SQL Editor',
            '3. Copy the contents of scripts/migrate-add-groups.sql',
            '4. Paste and run in SQL Editor',
            '5. Refresh this page'
          ]
        },
        { status: 503 }
      );
    }
    
    const groups = await GroupService.getAllGroups();
    return NextResponse.json(groups);
  } catch (error: any) {
    console.error('[API] Error fetching groups:', error);
    
    // Check if it's a table missing error
    if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Groups table does not exist',
          message: 'Database migration needed',
          instructions: [
            '1. Go to your Supabase project dashboard',
            '2. Navigate to SQL Editor',
            '3. Copy the contents of scripts/migrate-add-groups.sql',
            '4. Paste and run in SQL Editor',
            '5. Refresh this page'
          ]
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Check if groups table exists before trying to create
    const supabase = createSupabaseClient();
    const { error: tableError } = await supabase.from('groups').select('id').limit(1);
    
    // Check if table doesn't exist (not just "no rows")
    const tableMissing = tableError && 
      (tableError.code === '42P01' ||
       tableError.message?.toLowerCase().includes('does not exist') ||
       (tableError.message?.toLowerCase().includes('relation') && 
        !tableError.message?.toLowerCase().includes('permission')));
    
    if (tableMissing) {
      return NextResponse.json(
        { 
          error: 'Groups table does not exist',
          message: 'Database migration needed',
          automaticMigration: {
            available: !!process.env.POSTGRES_URL || !!process.env.POSTGRES_URL_NON_POOLING,
            endpoint: '/api/migrate',
            method: 'POST',
            note: 'If POSTGRES_URL is set, POST to /api/migrate to run automatically'
          },
          manualMigration: {
            instructions: [
              '1. Go to your Supabase project dashboard',
              '2. Navigate to SQL Editor',
              '3. Copy the contents of scripts/migrate-add-groups.sql',
              '4. Paste and run in SQL Editor',
              '5. Try creating the group again'
            ],
            sqlFile: 'scripts/migrate-add-groups.sql'
          }
        },
        { status: 503 }
      );
    }

    const group = await GroupService.createGroup(name);
    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    console.error('[API] Error creating group:', error);
    
    // Check if it's a table missing error
    if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === 'PGRST116') {
      return NextResponse.json(
        { 
          error: 'Groups table does not exist',
          message: 'Database migration needed',
          instructions: [
            '1. Go to your Supabase project dashboard',
            '2. Navigate to SQL Editor',
            '3. Copy the contents of scripts/migrate-add-groups.sql',
            '4. Paste and run in SQL Editor',
            '5. Try creating the group again'
          ],
          sqlFile: 'scripts/migrate-add-groups.sql'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create group', details: error.message },
      { status: 500 }
    );
  }
}

