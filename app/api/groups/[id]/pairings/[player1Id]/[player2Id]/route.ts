import { NextRequest, NextResponse } from 'next/server';
import { PairingStatsService } from '@/lib/services/pairingStatsService';

// GET /api/groups/[id]/pairings/[player1Id]/[player2Id] - Get detailed stats for a specific pairing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; player1Id: string; player2Id: string }> }
) {
  try {
    const { id: groupId, player1Id, player2Id } = await params;
    
    if (!groupId || !player1Id || !player2Id) {
      return NextResponse.json(
        { error: 'Group ID and both player IDs are required' },
        { status: 400 }
      );
    }

    const stats = await PairingStatsService.getPairingDetailedStats(groupId, player1Id, player2Id);

    if (!stats) {
      return NextResponse.json(
        { error: 'Pairing not found' },
        { status: 404 }
      );
    }

    // No caching - stats should always be fresh after score edits
    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('[API] Error fetching pairing details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pairing details' },
      { status: 500 }
    );
  }
}

