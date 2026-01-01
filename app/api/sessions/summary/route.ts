import { NextResponse } from 'next/server';
import { SessionService } from '@/lib/services/sessionService';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/sessions/summary - Get lightweight session summaries
export async function GET() {
  try {
    const summaries = await SessionService.getSessionSummaries();
    // Disable caching to ensure fresh data after deletions
    return NextResponse.json(summaries, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[API] Error fetching session summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session summaries' },
      { status: 500 }
    );
  }
}

