import { NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/groupService';

/**
 * GET /api/groups/[id]/overview
 * Get group overview statistics (total games, sessions, most active player, closest matchup)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;

    const stats = await GroupService.getGroupStats(groupId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API] Error fetching group overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group overview' },
      { status: 500 }
    );
  }
}
