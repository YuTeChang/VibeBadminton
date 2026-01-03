import { NextRequest, NextResponse } from 'next/server';
import { StatsService } from '@/lib/services/statsService';

// Allow caching with short TTL
export const revalidate = 5; // ISR: revalidate every 5 seconds

// GET /api/groups/[id]/players/[playerId]/stats - Get detailed stats for a player
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const { id: groupId, playerId } = await params;
    
    if (!groupId || !playerId) {
      return NextResponse.json(
        { error: 'Group ID and Player ID are required' },
        { status: 400 }
      );
    }

    const stats = await StatsService.getPlayerDetailedStats(groupId, playerId);

    if (!stats) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // No caching - stats should always be fresh after score edits
    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('[API] Error fetching player stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player stats' },
      { status: 500 }
    );
  }
}

