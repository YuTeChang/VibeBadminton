import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';

// GET /api/groups/[id]/sessions - Get all sessions in a group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    
    if (!groupId || groupId.trim() === '') {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }
    
    const sessions = await GroupService.getGroupSessions(groupId);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('[API] Error fetching group sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group sessions' },
      { status: 500 }
    );
  }
}


