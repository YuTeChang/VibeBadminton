import { NextResponse } from 'next/server';
import { SessionService } from '@/lib/services/sessionService';

// GET /api/sessions/summary - Get lightweight session summaries
export async function GET() {
  try {
    const summaries = await SessionService.getSessionSummaries();
    // Disable caching to ensure fresh data after deletions
    return NextResponse.json(summaries, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
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

