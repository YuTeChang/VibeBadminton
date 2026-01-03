import { NextRequest, NextResponse } from 'next/server';
import { PairingStatsService } from '@/lib/services/pairingStatsService';

// GET /api/groups/[id]/pairings - Get all pairing stats (leaderboard of best pairs)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    const pairings = await PairingStatsService.getPairingLeaderboard(groupId);

    // No caching - stats should always be fresh after score edits
    const response = NextResponse.json(pairings);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('[API] Error fetching pairings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pairings' },
      { status: 500 }
    );
  }
}

// Simple rate limiting for recalculation
const recalculationTimestamps = new Map<string, number>();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

// POST /api/groups/[id]/pairings - Recalculate pairing stats (admin/maintenance)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    // Rate limiting
    const lastRecalc = recalculationTimestamps.get(groupId);
    const now = Date.now();
    if (lastRecalc && now - lastRecalc < RATE_LIMIT_MS) {
      const waitMinutes = Math.ceil((RATE_LIMIT_MS - (now - lastRecalc)) / 60000);
      return NextResponse.json(
        { error: `Rate limited. Please wait ${waitMinutes} minute(s).` },
        { status: 429 }
      );
    }

    recalculationTimestamps.set(groupId, now);

    console.log(`[API] Recalculating pairing stats for group ${groupId}`);
    const result = await PairingStatsService.recalculatePairingStats(groupId);

    return NextResponse.json({
      success: true,
      message: 'Pairing stats recalculated successfully',
      ...result,
    });
  } catch (error) {
    console.error('[API] Error recalculating pairing stats:', error);
    // Note: Can't clean up rate limit here since params is async
    return NextResponse.json(
      { error: 'Failed to recalculate pairing stats' },
      { status: 500 }
    );
  }
}

