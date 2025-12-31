import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';

// GET /api/groups/[id]/sessions - Get all sessions in a group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    
    console.log('[API] GET /api/groups/[id]/sessions - groupId:', groupId, 'type:', typeof groupId);
    
    if (!groupId || groupId.trim() === '') {
      console.error('[API] GET /api/groups/[id]/sessions - Missing or empty groupId');
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[API] GET /api/groups/[id]/sessions - Calling GroupService.getGroupSessions...');
    const sessions = await GroupService.getGroupSessions(groupId);
    console.log('[API] GET /api/groups/[id]/sessions - GroupService returned', sessions.length, 'sessions');
    console.log('[API] GET /api/groups/[id]/sessions - Session IDs:', sessions.map(s => s.id));
    
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('[API] Error fetching group sessions:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Failed to fetch group sessions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


