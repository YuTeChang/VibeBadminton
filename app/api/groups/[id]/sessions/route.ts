import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/groups/[id]/sessions - Get all sessions in a group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 14 (object) and Next.js 15 (Promise) params
    const resolvedParams = params instanceof Promise ? await params : params;
    const groupId = resolvedParams.id;
    
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


