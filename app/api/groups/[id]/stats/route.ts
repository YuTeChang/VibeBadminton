import { NextRequest, NextResponse } from 'next/server';
import { StatsService } from '@/lib/services/statsService';
import { EloService } from '@/lib/services/eloService';
import { PairingStatsService } from '@/lib/services/pairingStatsService';

// Simple in-memory rate limiting for recalculation
const recalculationTimestamps = new Map<string, number>();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes between recalculations per group

// GET /api/groups/[id]/stats - Get leaderboard data for a group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    const leaderboard = await StatsService.getLeaderboard(groupId);

    // Add caching headers (shorter cache for fresh data)
    const response = NextResponse.json(leaderboard);
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=5, stale-while-revalidate=10'
    );
    
    return response;
  } catch (error) {
    console.error('[API] Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/stats - Recalculate all stats for a group (admin/maintenance only)
// Protected with rate limiting - max 1 recalculation per 5 minutes per group
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id;
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const lastRecalc = recalculationTimestamps.get(groupId);
    const now = Date.now();
    if (lastRecalc && now - lastRecalc < RATE_LIMIT_MS) {
      const waitMinutes = Math.ceil((RATE_LIMIT_MS - (now - lastRecalc)) / 60000);
      return NextResponse.json(
        { 
          error: `Rate limited. Please wait ${waitMinutes} minute(s) before recalculating again.`,
          retryAfter: waitMinutes * 60
        },
        { status: 429 }
      );
    }

    // Update timestamp before processing to prevent parallel requests
    recalculationTimestamps.set(groupId, now);

    console.log(`[API] Admin: Recalculating all stats for group ${groupId}`);
    
    // Recalculate individual player ELO and win/loss stats
    const eloResult = await EloService.recalculateGroupElo(groupId);
    
    // Also recalculate pairing stats (partner and matchup stats)
    const pairingResult = await PairingStatsService.recalculatePairingStats(groupId);

    return NextResponse.json({
      success: true,
      message: 'All stats recalculated successfully',
      playerStats: eloResult,
      pairingStats: pairingResult,
    });
  } catch (error) {
    console.error('[API] Error recalculating stats:', error);
    // Clear rate limit on error so it can be retried
    recalculationTimestamps.delete(params.id);
    return NextResponse.json(
      { error: 'Failed to recalculate stats' },
      { status: 500 }
    );
  }
}

